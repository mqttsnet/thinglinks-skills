# 产品版本发布编排(策略 / 灰度名单 / 重试)

物模型版本发布的执行层:解快照 → 建 TDengine 超表 → **按策略改绑设备** → 刷物模型缓存 → 回写发布记录。入口 `ProductVersionPublishOrchestrator`(`thinglinks-link-biz/.../productversion/publish/orchestrator`),三种生命周期动作统一收口:`runPublish` / `runRollback` / `runPurge`。

> 建表细节(超表 schema / Tag / 字节上限)见 `iot/thing-model.md`;物模型缓存按版本号见 `iot/cache.md`;升级包驱动的设备版本迁移见 `iot/ota.md`。

## 编排器入口与执行流

`ProductVersionPublishOrchestrator.runPublish(ProductVersionLifecycleEventSource)`(返 `boolean`):
1. `findByProductIdentificationAndVersionNo` 取版本行 → 反序列化 `product_snapshot_json` → `ProductSnapshotVO`;快照缺失直接 `markFailed`;
2. 逐 service `ProductTdsNamer.superTableName(...)` → `tdsFacade.createSuperTableAndColumn`,每个 service 一条 `PublishDdlItemVO`(含 success / errorMsg / durationMs,前端弹窗可视化),`attachDdlItems` typed 写 `ddl_summary`;
3. **任一 DDL 失败 → 不刷缓存、不改设备、`markFailed`**,等兜底 job 幂等重跑到全绿才闭环(老逻辑此处会刷缓存,导致改绑后无表可写);
4. DDL 全绿 → 先 `refreshProductModelCache`(确保新版本 entry 就绪)→ `rebindDevices(...)` 按策略改绑 → `attachStrategyResult` 写策略快照 → `markSuccess`。

> 触发口径:`ProductVersionServiceImpl.publish` 落 `RUNNING` 记录 + 发 `publishPublished` 事件(异步监听器跑 `runPublish`);兜底 job 也跑同一份 `runPublish`(见"重试")。**事件入口与 job 共享逻辑** = 幂等可重跑的前提。

## 三种发布策略(`publish/strategy`)

按 `publishStrategy` 路由到 `DeviceRebindStrategy` 实现(`rebind(productIdentification, newVersion, canaryConfigJson)` 返改绑数);构造时 List→`EnumMap`,缺失策略回退 FULL。

| 策略 | 实现类 | 改绑行为 |
| --- | --- | --- |
| **FULL** | `FullDeviceRebindStrategy` → `DeviceRebindStreamer.streamFull` | **游标分批流式改绑**:`listRebindCursorPageByProduct` 游标翻页(恒定内存)、有界 IN(PAGE_SIZE 2000)、小事务 `bulkRebindByIds`,无全表锁 / OOM |
| **CANARY** | `CanaryDeviceRebindStrategy` | 取 `CanaryConfigDTO` 白名单(分组 / 指定设备两种来源拍平成 `deviceIdentifications`)→ `bulkRebindByIdentificationsIncludingSubDevices` **按网关粒度改绑**(命中网关连带子设备,保不变式"子设备版本=所属网关版本");名单空返 0 + warn,配置整段缺失抛 `BizException` |
| **SHADOW** | `ShadowDeviceRebindStrategy` | **`rebind` 恒返 0、不改绑任何设备**;指针也不切(在 publish service 层决定)。只预建超表占位,设备照各自绑定版本写表 ── 启用靠外部 `switchBoundProductVersion` 把设备切到影子版本(见 `iot/ota.md`) |

### ⚠️ 灰度已去百分比(percent 移除)

- 灰度**只按明确设备名单**:`CanaryConfigDTO{mode="whitelist", deviceIdentifications, source("group"/"manual" 仅展示), groups:List<CanaryGroup>}`(`productversion/vo/canary`);`CanaryGroup{groupId, groupName, deviceCount}` 冻结发布那刻所选分组。
- **`CanaryConfigDTO` 无 `percent` 字段**;一致性哈希取模的 **`CanaryRuleMatcher` 已删除**(原 `productversion/canary` 包,现空目录)。新设备不再按哈希随机入灰度 ── 灰度跟着名单 / 固件版本走。
- 注意:执行结果快照 `StrategyResultDTO.CanaryResult` 仍残留一个 `percent` 字段(历史 schema,灰度路径不再产出),勿当作仍支持百分比灰度。

## 重试:整条记录幂等 rerun

发布异步执行遇服务异常 / JVM 重启会让 `product_publish_record` 卡 `RUNNING` / `FAILED`。兜底 **不做分项部分重试**,而是 `retryRunningRecordsForTenant` 周期扫描后按 intent **整条记录幂等重跑** `runPublish` / `runRollback` / `runPurge`:

- **幂等三件套**:`CREATE STABLE IF NOT EXISTS`(重复建表无副作用)+ 设备 `SET` 改绑到同值幂等 + `DROP STABLE IF EXISTS`,重跑已成功的部分是 no-op,无需 per-item 断点续跑;
- **扫描窗口**:RUNNING 回溯 24h(创建超 1h 仍 RUNNING 判永久卡死 → `markFailed` 不再重试);FAILED 只捞 1h 内新近失败;每状态单次限 100 条;
- **记录级上限**:`rerun` 前查 `retryCount >= maxRetryCount` 则不再实际重跑(保持 FAILED,窗口老化后不再被捞 = 双重兜底),否则 `incrementRetryCount` 后重跑。`maxRetryCount` 取用户配置 **clamp 到 1~10**(`ProductVersionServiceImpl.resolvePublishMaxRetry`,缺省 3)。
- 兜底已拆为**独立 XXL-Job** `flushProductVersionPublishRetryJobHandler`(facade `retryProductVersionPublish`),与缓存预热解耦,见 `build-run.md`。

### 发布记录 `product_publish_record`(关键列)

| 列 | 用途 |
| --- | --- |
| `ddl_summary` | DDL 明细数组(`PublishDdlItemVO` JSON:每超表 create + describe 真实 schema 快照、attemptCount、durationMs) |
| `canary_result_json` | **策略执行结果快照** `StrategyResultDTO`(发布那刻冻结,不随后续切流/晋升变):`strategy` + `affectedDeviceCount` + `productTotalAtPublish`(占比基数)+ 灰度补 `CanaryResult{source,groups,deviceIdentifications,targetCount}` / 影子补 `ShadowResult{preBuiltStableCount}` |
| `retry_count` / `max_retry_count` | 累计重试数 / 记录级重试上限(1~10,缺省 3) |

> 记录表无 `publishStrategy` 列 ── 兜底 `reconstructEventSource` 从 `product_version` 反查策略。

## 灰度期稳定版 `previousFullVersionNo`

灰度发布时把"切换前的 `activeVersionNo`"记入 `product.previous_full_version_no`,作为灰度期间**新设备 / 导入 / 遥测回退**应绑的稳定版(避免未入灰度组的存量设备落到灰度超表)。镜像到 `ProductCacheVO.previousFullVersionNo`(见 `iot/cache.md`)。

| 动作 | 入口(`ProductServiceImpl`) | 对 `previousFullVersionNo` |
| --- | --- | --- |
| 灰度发布 | `switchActiveVersionForPublish(..., recordCurrentAsPrevious=true)` | **set** = 切换前 active(非空 → 进入灰度态) |
| 全量发布 | `switchActiveVersionForPublish(..., false)` | **clear**(`clearPreviousFullVersion` 显式 `SET NULL`) |
| 回滚 | `rollbackActiveVersion` | **clear**(同上) |

> ⚠️ `updateById` 在全局 `NOT_NULL` 更新策略下写不掉 null,清空必须走 `ProductManager.clearPreviousFullVersion`(`LambdaUpdateWrapper.set(col, null)`)── 否则灰度晋升/回滚后残留 previous,新设备长期绑老稳定版 +"灰度中"统计误判。

**`demoteSupersededCanary`**(`ProductVersionServiceImpl`,`publish` 内切指针后调):被取代的上一个 active 版本若仍是瞬态 `CANARY`,demote 为 `PUBLISHED`(历史态);否则灰度晋升/放量后版本列表残留 `CANARY` 标签,误导"仍在灰度中"(实际 active 指针已指向新版本)。仅当前状态为 CANARY 时才降级,幂等。

## 涉及代码

| 关注点 | 类 / 路径(`thinglinks-link`) |
| --- | --- |
| 编排器 | `productversion/publish/orchestrator/ProductVersionPublishOrchestrator` |
| 策略 SPI + 实现 | `productversion/publish/strategy/{DeviceRebindStrategy, FullDeviceRebindStrategy, CanaryDeviceRebindStrategy, ShadowDeviceRebindStrategy, DeviceRebindStreamer}` |
| 灰度配置 | `productversion/vo/canary/{CanaryConfigDTO, CanaryGroup}`(**`CanaryRuleMatcher` 已删**) |
| 策略结果快照 | `productpublishrecord/vo/result/StrategyResultDTO`(内嵌 `CanaryResult` / `ShadowResult`) |
| 发布记录实体 | `productpublishrecord/entity/ProductPublishRecord`(`canary_result_json` / `retry_count` / `max_retry_count`) |
| 发布 service / 指针 | `productversion/service/impl/ProductVersionServiceImpl`(`publish` / `demoteSupersededCanary` / `resolvePublishMaxRetry`)、`product/service/impl/ProductServiceImpl`(指针切换 / 清 previous)、`product/manager/impl/ProductManagerImpl.clearPreviousFullVersion` |

---

> 📌 **最后核对**:`thinglinks-cloud-pro` · 2026-06-18(两线同构)。类名/包名/行号随版本演进,落地前请核对真实代码 `com.mqttsnet.thinglinks.*`。
