# OTA 升级驱动物模型版本切换 + 设备版本切换原语

OTA 升级包可配置**目标产品版本**(影子版本);升级成功 / 设备上报版本时,`OtaModelVersionSwitcher` 把设备绑定的产品版本迁到该目标版本。底层复用通用的设备版本切换原语 `switchBoundProductVersion`(影子发布的"外部切流"入口),它与版本分布统计 `countDeviceVersionDistribution` 一起对外暴露。

> 发布编排 / 影子策略 / 灰度期稳定版见 `iot/product-version-publish.md`;下行 OTA 命令 topic 见 `iot/downlink-command.md`;改绑触发的缓存失效见 `iot/cache.md`。

## 升级包目标版本字段

`OtaUpgrades.productVersionNo`(`ota/entity`,列 `product_version_no`,SQL `ota_upgrades.product_version_no`):升级包预先配置的目标产品版本号(影子版本)。设备升完按它迁绑 → 灰度跟着固件 / 软件版本走,而非随机哈希。为空则不驱动切换。

## OtaModelVersionSwitcher(`ota/service/support`)

`@Component`,注入 `DeviceService` + `OtaUpgradesService`。两处触发(均落在 `OtaUpgradeTasksServiceImpl`):

| 触发口径 | 方法 | 语义 |
| --- | --- | --- |
| **升级成功**(hook A) | `switchOnUpgradeSuccess(productIdentification, deviceIdentification, productVersionNo)` | 某设备本次升级记录 = 成功,直接用升级包的 `productVersionNo` 切该设备绑定版本 |
| **版本上报**(hook B) | `syncByReportedVersion(productIdentification, deviceIdentification, reportedVersion, packageType)` | 设备上报固件/软件版本 → `otaUpgradesService.resolveProductVersionNo(...)` 反查"该产品+该上报版本"对应升级包,取其目标版本切换(兼容升完直接上报、不走人工确认) |

两者经私有 `doSwitch` 收口:**三要素(产品标识 / 设备标识 / 目标版本)任一为空直接 return(不驱动切换)**。

### ⚠️ 幂等 + fail-soft

- **幂等**:底层 `switchBoundProductVersion` 对"已在目标版本"的设备重复切换是同值写入,无副作用;
- **fail-soft**:`doSwitch` try/catch 吞异常,目标版本非法 / 已被清理(drop stable)等**只记 `log.warn`,绝不中断 OTA 上报与升级记录落库**。

## 设备版本切换原语(`DeviceService` / `DeviceServiceImpl`)

OTA 与影子切流都靠这两个方法,对外经 `DeviceController`(base `/device`)暴露。

### switchBoundProductVersion

```java
int switchBoundProductVersion(String productIdentification, List<String> deviceIdentifications, String targetVersionNo);
```
- **网关粒度带子设备**:复用 `bulkRebindByIdentificationsIncludingSubDevices`,命中网关连带其子设备一并切(保不变式"子设备版本=所属网关版本");返回实际改绑行数(含子设备,无匹配返 0);
- **校验目标版本就绪**:`assertSwitchableTargetVersion` 要求目标版本状态 ∈ {`PUBLISHED`, `CANARY`, `SHADOW`}(这些状态 TD 超表已建好,切过去才有表可写),否则抛 `BizException`;
- **发 `DeviceRebindEvent` 清缓存**:改绑后按 `productIdentification` 发事件,`DeviceCacheEvictListener.onDeviceRebind`(AFTER_COMMIT)失效设备缓存(覆盖连带的子设备),见 `iot/cache.md`;
- 参数任一为空抛 `BizException`(三者必填)。

### countDeviceVersionDistribution

```java
DeviceVersionDistributionVO countDeviceVersionDistribution(String productIdentification);
```
- 一次 `GROUP BY bound_product_version_no` 统计该产品下各绑定版本的设备数(MyBatis-Plus `listMaps` 自动带逻辑删除条件);未绑定归到空串 key;
- 供发布管理 / 版本列表展示"灰度/影子铺开到啥程度"(各版本当前多少台、占比)。发布编排也用它取 `productTotalAtPublish` 作占比基数。

## DeviceController 端点(base `/device`)

| 方法 | 端点 | 入参 / 出参 |
| --- | --- | --- |
| `switchBoundProductVersion` | `PUT /device/switchBoundProductVersion` | `@RequestBody DeviceVersionSwitchVO` → `R<Integer>`(改绑数) |
| `getVersionDistribution` | `GET /device/versionDistribution/{productIdentification}` | `@PathVariable productIdentification` → `R<DeviceVersionDistributionVO>` |

## VO / DTO(`thinglinks-link-entity`)

| 类型 | 路径 | 字段 |
| --- | --- | --- |
| `DeviceVersionSwitchVO` | `device/vo/update` | `productIdentification`(必填)、`deviceIdentifications`(必填,命中网关连带子设备)、`targetVersionNo`(必填,须为该产品 已发布/灰度/影子 版本) |
| `DeviceVersionDistributionVO` | `device/vo/result` | `total`(产品设备总数,含未绑定)、`versionCounts`(`Map<版本号, 设备数>`,未绑定归空串) |
| `DeviceVersionCountDTO` | `device/dto` | `versionNo`、`deviceCount`(分组查询行映射) |

## 涉及代码

| 关注点 | 类 / 路径 |
| --- | --- |
| 切换器 | `thinglinks-link-biz .../ota/service/support/OtaModelVersionSwitcher` |
| 触发点 | `thinglinks-link-biz .../ota/service/impl/OtaUpgradeTasksServiceImpl`(升级成功 / 上报 / read 响应) |
| 升级包实体 | `thinglinks-link-entity .../ota/entity/OtaUpgrades`(`product_version_no`) |
| 切换原语 | `thinglinks-link-biz .../device/service/{DeviceService, impl/DeviceServiceImpl}` |
| 改绑事件 | `thinglinks-link-biz .../device/event/{DeviceRebindEvent, source/DeviceRebindEventSource}` |
| 控制器 | `thinglinks-link-controller .../device/controller/DeviceController` |
| SQL | `thinglinks-tenant-datasource-init .../schema/{mysql,dm}/thinglinks_base.sql`(`ota_upgrades.product_version_no`) |

---

> 📌 **最后核对**:`thinglinks-cloud-pro` · 2026-06-18(两线同构)。类名/包名/行号随版本演进,落地前请核对真实代码 `com.mqttsnet.thinglinks.*`。
