# 设备数据落库 + 设备影子

`DeviceDataProcessingServiceImpl.processDeviceDataReport(TopoDeviceDataReportParam)`(`thinglinks-mqs-biz/.../service/impl`,行 78)。`DeviceDatasHandler` 解析标准信封后调它。

## processDeviceDataReport 分步骤

1. **路由版本号**(93-114):取 `device.boundProductVersionNo`,空则回退 `product.activeVersionNo`(并异步回写 device 表 + 失效缓存,后续走设备版本)。
2. **解析物模型**(119-127):`resolveProductModelByVersionNo(productId, 设备绑定版本)` → 灰度时读旧版本快照(与影子版本一致)。
3. **子表按需建**(140-189):用超表名查 TD 子表是否存在;不存在 → `tdsApi.createSubTable()`。超表名 `ProductTdsNamer.superTableName(...)`、子表名 `TdsUtils.subTableName(superTableName, deviceId)`、Tag `device_identification=deviceId`。建好缓存超表结构到 Redis。(**超表不在此建,在版本发布时建** —— 见 `thing-model.md`)
4. **写 TDengine**(197-254):按物模型把 data 映射到列 + Tag;`ts`=纳秒时间戳、`event_time`=报文事件时间;`tdsApi.insertTableData()` 落子表。
5. **刷影子**(274-279):结构化数据(`ProductResultVO`)写入**采集池缓存**(Redis Sorted Set)`linkCacheDataHelper.setDeviceDataCollectionPoolCacheVO`。

## 设备影子存储(无单独"影子表")

影子 = **TDengine 子表最后一条记录的结构化视图** + **Redis 采集池临时缓存**:
- **数据源(权威)**:TDengine 子表,表名 `${productType}_${productId}_${versionNo}_${serviceCode}_${deviceId}`;
- **采集池缓存**:Redis Sorted Set,key `link:def_device_data_collection_pool:{tenantId}:{productId}:{deviceId}`,写入走 `LinkCacheDataHelper.setDeviceActionCacheVO`,member=`DeviceActionCacheVO`,score=微秒时间戳(`DateUtils.microsecondStampL()`),TTL 24h。**没有条数上限** —— 只有 `zAdd` + `expire`,清理靠 TTL 与按 score 的 `zRemRangeByScore`,不要说它会自动裁到多少条;
- **读影子**:`DeviceShadowServiceImpl.queryDeviceShadow`(行 63)→ 版本路由(入参 versionNo ?: device.boundProductVersionNo)→ `tdsApi.getDataInRangeOrLastRecord(subTableName, ...)` 取子表最后一条 → 按物模型组装 ProductResultVO。

## 子表不存在排查

`子表不存在`/`insert ... failed` = 该版本服务的**超表未建**(版本未发布)→ 重新发布产品版本(建表 DDL 成功)。子表本身首次上报会自动建。
