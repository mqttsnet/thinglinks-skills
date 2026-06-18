# 缓存(设备 / 产品 / 物模型)

统一入口 `LinkCacheDataHelper`(`thinglinks-link-biz/.../cache/helper`)。Redis read-through(`CachePlusUtil.getOrLoad`),`@DS(BASE_TENANT)` 自动切租户库。

## LinkCacheDataHelper 方法(返回 Optional)

| 方法 | 返回 |
| --- | --- |
| `getDeviceCacheVO(deviceIdOrClientId)` | `Optional<DeviceCacheVO>`(传 deviceId 或 clientId 都行) |
| `getProductCacheVO(productIdentification)` | `Optional<ProductCacheVO>` |
| `resolveProductModelByVersionNo(productId, versionNo)` | `Optional<ProductModelCacheVO>` |
| `resolveProtocolType(productId, versionNo)` | `Optional<String>` |
| `getDeviceAclRules(productId, deviceId)` | `List<DeviceAclRuleCacheVO>`(Redis Hash) |
| `setDeviceDataCollectionPoolCacheVO(...)` | 写采集池(影子,Redis Sorted Set) |

handler 里优先 `source.getDeviceCacheVO()`(上行已透传),缺失再 helper;`AbstractMessageHandler.resolveDeviceCache(source, deviceId)` 封装了回退。

## DeviceCacheVO 关键字段(`cache.vo.device`,**不含 password 给脚本**)

`deviceIdentification`、`productIdentification`、`boundProductVersionNo`(**设备绑定版本,决定命中哪个脚本/物模型/影子**)、`clientId`、`userName`/`password`、`authMode`(0 账号/1 证书)、`signKey`、`encryptKey`、`encryptVector`、`encryptMethod`(0 明文/1 SM4/2 AES)、`fwVersion`/`swVersion`、`deviceStatus`、`connectStatus`、`nodeType`(0 普通/1 网关/2 子设备)、`gatewayId`、`tenantId`。

## ProductCacheVO 关键字段(`cache.vo.product`)

`productIdentification`、`activeVersionNo`(**产品当前激活版本**)、`previousFullVersionNo`(**灰度期稳定版,非空=灰度中**;晋升/回滚后置空)、`protocolType`(默认 MQTT)、`dataFormat`(默认 JSON)、`productType`(0 其他/1 普通/2 网关)、`productStatus`、`tenantId`。

> `previousFullVersionNo`(镜像自 `product.previous_full_version_no`)是灰度路由兜底:**新建设备 / 批量导入 / 遥测无绑定版本回退**时,灰度态下绑/读它(稳定版)而非 `activeVersionNo`(灰度版),避免未入灰度组的存量设备落到灰度超表。转正/回滚由 `ProductManager.clearPreviousFullVersion` 显式 `SET NULL` 置空(`updateById` NOT_NULL 策略写不掉 null)。消费方:`DeviceServiceImpl`(新建)、`DeviceEasyExcelServiceImpl`(导入)、mqs `DeviceDataProcessingServiceImpl` / `InboundScriptTransformer`(遥测回退)。设置/清空见 `iot/product-version-publish.md`。

## ProductModelCacheVO + 嵌套(物模型,给脚本 `productModel`)

`ProductModelCacheVO{ productIdentification, activeVersionNo, ..., services: List<ProductServiceParamVO> }`
- `ProductServiceParamVO{ serviceCode, serviceName, serviceType, serviceStatus(0 启用/1 停用), properties: List<ProductPropertyParamVO>, commands: List<ProductCommandParamVO> }`
- `ProductPropertyParamVO{ propertyCode, propertyName, datatype, enumlist, unit, method(R/RW/RE/RWE), required(0/1), min/max/step/maxlength }`
- `ProductCommandParamVO{ commandCode, commandName, requests, responses }`

> 脚本里:`productModel?.services?.find{ it.serviceCode == sc }?.properties*.propertyCode`。

## Redis key / TTL / 失效

| 缓存 | key 格式 | TTL | 失效触发 |
| --- | --- | --- | --- |
| 设备 | `link:def_device:id:obj:{tenantId}:{deviceId或clientId}` | 72h | `DeviceCacheEvictListener`(AFTER_COMMIT):`onDeviceDeleted`(删除)+ `onDeviceRebind`(`DeviceRebindEvent`:`switchBoundProductVersion` 切版本 / 发布期改绑) |
| 产品 | `link:def_product:id:obj:{tenantId}:{productId}` | 24h | `ProductCacheEvictListener`(发布/回滚,AFTER_COMMIT) |
| 物模型(按版本) | `link:def_product_model:id:obj:{tenantId}:{productId}:{versionNo}` | 7d | 版本快照不可变 → 预热 `activeVersionNo`(灰度态额外暖 `previousFullVersionNo` 稳定版),其余历史版本首读 read-through 回源 |

> 物模型按**版本号**缓存 = 灰度路由核心:旧版本设备永远读旧快照。`ProductModelCacheService.refreshProductModelCache` 在灰度态(`previousFullVersionNo` 非空且 ≠ active)对稳定版也做预热(尽力而为,失败不影响 active 刷新),因稳定设备 + 新设备都绑稳定版。
> `DeviceRebindEvent`(`device.event`,源 `DeviceRebindEventSource{productIdentification, deviceIdentifications, toVersion, contextMap}`)由 `switchBoundProductVersion` / 发布期改绑发出:带名单→失效这些设备;只带产品标识(全量/回滚)→失效该产品下全部设备。`contextMap` 复原租户上下文,避免 `@DS(BASE_TENANT)` 切错库。
