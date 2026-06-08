# 物模型(thing-model)

产品的服务/属性定义,决定上报字段名与类型。VO 字段见 `references/cache.md`(ProductModelCacheVO → ProductServiceParamVO → ProductPropertyParamVO)。

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

`ProductVersionPublishOrchestrator.runPublish`(`thinglinks-link-biz/.../productversion/publish/orchestrator`,行 122):
1. 反序列化 `product_version.product_snapshot_json` → ProductSnapshotVO(该版本所有 services + properties);
2. **遍历每个 service 建 TDengine 超表**:`ProductTdsNamer.superTableName(productType, productId, versionNo, serviceCode)` → `tdsFacade.createSuperTableAndColumn`(行 141-171);
   - Schema 列:`ts`(TIMESTAMP 纳秒)+ `event_time`(TIMESTAMP)+ 每属性一列(按 propertyCode,类型由 datatype 决定);
   - Tag:`device_identification`(BINARY 64);
   - 单 NCHAR/BINARY 字段字符数 cap 5000(防超 TDengine 65531 字节行上限);
3. 全部 DDL 成功 → 刷物模型缓存 + 按 `publishStrategy`(FULL/CANARY)改绑设备 + 标记发布 SUCCESS。

> 影子/时序某服务无数据 → 多半该服务 `serviceStatus` 停用、或版本未发布(超表未建)→ 启用并重新发布版本。子表首次上报自动建(见 `references/device-data.md`)。

## 缓存

`productModel`(`ProductModelCacheVO`)按**版本号**缓存(7d,快照不可变)→ 灰度:旧版本设备读旧物模型。
