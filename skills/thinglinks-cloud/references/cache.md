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

`productIdentification`、`activeVersionNo`(**产品当前激活版本**)、`protocolType`(默认 MQTT)、`dataFormat`(默认 JSON)、`productType`(0 其他/1 普通/2 网关)、`productStatus`、`tenantId`。

## ProductModelCacheVO + 嵌套(物模型,给脚本 `productModel`)

`ProductModelCacheVO{ productIdentification, activeVersionNo, ..., services: List<ProductServiceParamVO> }`
- `ProductServiceParamVO{ serviceCode, serviceName, serviceType, serviceStatus(0 启用/1 停用), properties: List<ProductPropertyParamVO>, commands: List<ProductCommandParamVO> }`
- `ProductPropertyParamVO{ propertyCode, propertyName, datatype, enumlist, unit, method(R/RW/RE/RWE), required(0/1), min/max/step/maxlength }`
- `ProductCommandParamVO{ commandCode, commandName, requests, responses }`

> 脚本里:`productModel?.services?.find{ it.serviceCode == sc }?.properties*.propertyCode`。

## Redis key / TTL / 失效

| 缓存 | key 格式 | TTL | 失效触发 |
| --- | --- | --- | --- |
| 设备 | `link:def_device:id:obj:{tenantId}:{deviceId或clientId}` | 72h | `DeviceCacheEvictListener`(删除/改绑,AFTER_COMMIT) |
| 产品 | `link:def_product:id:obj:{tenantId}:{productId}` | 24h | `ProductCacheEvictListener`(发布/回滚,AFTER_COMMIT) |
| 物模型(按版本) | `link:def_product_model:id:obj:{tenantId}:{productId}:{versionNo}` | 7d | 版本快照不可变 → 仅预热 activeVersionNo,历史版本首读 read-through 回源 |

> 物模型按**版本号**缓存 = 灰度路由核心:旧版本设备永远读旧快照。
