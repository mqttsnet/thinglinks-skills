# 物模型(thing-model)

产品的服务/属性定义,决定上报字段名与类型。VO 字段见 `cache.md`(ProductModelCacheVO → ProductServiceParamVO → ProductPropertyParamVO)。

## 结构

```
product
└── services[]   ProductServiceParamVO: serviceCode、serviceName、serviceStatus(0 启用/1 停用)
    ├── properties[]  ProductPropertyParamVO: propertyCode、datatype、enumlist、unit、method、required、min/max/step
    └── commands[]    ProductCommandParamVO: commandCode、requests、responses(下行命令定义)
```

上报输出:`services[].serviceCode` = `serviceCode`;`data` 的键 = `propertyCode`;值类型按 `datatype`。

## datatype → 产出

| datatype | 产出 | 示例 |
| --- | --- | --- |
| string | String | `"loop"` |
| int | Integer/Long | `76` |
| decimal | BigDecimal/Double | `23.5` |
| bool | boolean | `true` |
| DateTime | `"yyyy-MM-dd HH:mm:ss"` 串(SimpleDateFormat) | `"2026-06-08 20:00:00"` |
| jsonObject | Map/List | `[id:1]` |
| 枚举(看 `enumlist`) | String,取枚举值之一 | `"ONLINE"` |

`method` = 访问模式(R 只读 / RW 读写 / RE 只读+事件 / RWE);`required` 0/1;`unit` 单位。

## 版本发布建表(关键:超表在发布时建,不是上报时)

`ProductVersionPublishOrchestrator.runPublish(ProductVersionLifecycleEventSource)`(`thinglinks-link-biz/.../productversion/publish/orchestrator`)。发布走"事件入口 + 定时兜底 job 共享同一份逻辑、整条记录幂等 rerun"模式(发布失败由 job 周期重跑,非按行号一次性流程),细节见 `iot/product-version-publish.md`:
1. 反序列化 `product_version.product_snapshot_json` → ProductSnapshotVO(该版本所有 services + properties);
2. **遍历每个 service 建 TDengine 超表**:`ProductTdsNamer.superTableName(productType, productId, versionNo, serviceCode)` → `tdsFacade.createSuperTableAndColumn`;
   - Schema 列:`ts`(TIMESTAMP 纳秒)+ `event_time`(TIMESTAMP)+ 每属性一列(按 propertyCode,类型由 datatype 决定);
   - Tag:`device_identification`(BINARY 64);
   - 单 NCHAR/BINARY 字段字符数 cap 5000;一个服务的所有字段字节数累加超过 65531 直接抛 `BizException` 带 Top-3 大字段(NCHAR 按 UTF-32 每字符 4 字节计);
3. 全部 DDL 成功 → 刷物模型缓存 + **按发布策略改绑设备**(改绑由策略实现执行,不再内联在编排器):
   - **FULL** → `DeviceRebindStreamer` 游标分批流式改绑(恒定内存,小事务);
   - **CANARY** → 按设备名单 / 分组改绑(命中网关连带子设备),**无百分比**;
   - **SHADOW** → 只预建超表、**不改绑**,靠外部 `switchBoundProductVersion` 切流；
   再写策略执行结果快照 `canary_result_json` + 标记发布 SUCCESS。三策略与重试详见 `iot/product-version-publish.md`。

> ⚠️ **65531 是平台加的,不是时序库加的。**`TdSchemaInspector.TD_ROW_MAX_BYTES` 由 link 侧的
> `validateRowBytes` 在发布时对**所有扩展库引擎一视同仁**地校验。扩展库现在三选一
> (TDengine / ClickHouse / IoTDB),而 CK 与 IoTDB 的字符串列本身并不限长 ——
> 所以**不要回答「换成 ClickHouse 就没这个限制」**。后端若改成按引擎放开,前端发布记录里的
> 百分比与告警色要同步调整。引擎差异见 `thinglinks-util` skill 的 `tds-extend-db.md`。

> 影子/时序某服务无数据 → 多半该服务 `serviceStatus` 停用、或版本未发布(超表未建)→ 启用并重新发布版本。子表首次上报自动建(见 `device-data.md`)。

## 缓存

`productModel`(`ProductModelCacheVO`)按**版本号**缓存(7d,快照不可变)→ 灰度:旧版本设备读旧物模型。
