# tds-starter 与扩展库(时序库)

`com.mqttsnet.basic.tds.*` —— 超表 / 子表 / 字段 / 标签的 SQL 构造与类型映射。
落库业务在 cloud 侧(`DeviceDataProcessingService`,见 `thinglinks-cloud` skill),
这里只讲底座。

## 扩展库不再只有 TDengine

自 `feat(tds): 扩展库支持 ClickHouse 与 IoTDB` 起,扩展库(时序库)支持三种引擎:
**TDengine / ClickHouse / IoTDB**。

驱动是**非 optional 预置**(与 taos / dm 一样),这是「切引擎只改 Nacos 数据源配置」的前提 ——
optional 依赖不会传递到各业务服务,运行期会 `ClassNotFoundException`。
当前版本:`clickhouse-jdbc` 0.9.0(classifier `all`)、`iotdb-jdbc` 2.0.8。

## 建库选项按引擎分开配

三种引擎的建库子句**互不兼容**,把 TDengine 那串发给 ClickHouse 或 IoTDB 是语法错。
`DatabaseProperties.ExtendSqlParameters` 因此拆成三项:

| 属性 | 默认 |
| --- | --- |
| `tdengineCreateDatabaseOptions` | `vgroups 10 buffer 10 precision 'ns'` |
| `clickhouseCreateDatabaseOptions` | 空(CH 建库不需要额外子句,要指定 ENGINE 时才填) |
| `iotdbCreateDatabaseOptions` | 空 |

取哪一项由建库处**按扩展库数据源的 URL 判定**,不是由配置项显式选择。

## ⚠️ IoTDB 的时间精度是硬前提

IoTDB 的 `timestamp_precision` 是 **server 级配置**(`conf/iotdb-system.properties`,
docker 下 `-e timestamp_precision=ns`),**建库语句里指定不了,且集群初始化后不可更改**。

默认是毫秒,而平台契约是纳秒(mqs 写入纳秒时间戳)。实测 2.0.8:精度为 ms 时写纳秒时间戳
直接报 `701 The timestamp is unexpectedly large`。

**部署 IoTDB 之前必须先把 server 精度设成 ns。**这是前提条件,不是可调优项 ——
被问到「IoTDB 写不进去」时先查这一条,不要去改建库选项。

## IoTDB 只支持 2.x 表模型

驱动 `org.apache.iotdb.jdbc.IoTDBDriver`,**JDBC URL 必须带 `?sql_dialect=table`**。
缺了它连的是树模型,平台的建表/写入语句全部对不上。控制台数据源配置页的驱动下拉里
已经列了 clickhouse 与 iotdb 两项,但 URL 后缀要人工填,漏填不会有提示。

## 行级字节上限是平台加的,不是引擎的

发布产品版本时 `ProductVersionPublishOrchestrator.validateRowBytes` 会把一个服务的所有字段
字节数累加,超过 `TdSchemaInspector.TD_ROW_MAX_BYTES`(65531)直接抛 `BizException`。
NCHAR 按 UTF-32 每字符 4 字节计。

**这条校验对三种引擎一视同仁**,ClickHouse 与 IoTDB 的字符串列本身并不限长 ——
所以不要回答「换成 ClickHouse 就没这个限制」。后端若改成按引擎放开,
前端发布记录里的百分比与告警色要同步调整,否则会对着一个不存在的限制标红。

## `DbPlusUtil` 要认得出 URL,否则新建租户直接失败

`DbPlusUtil` 按 `jdbc:(.*?):` 取引擎名再解析 host/port/db。识别清单里现在含
`mysql` / `cobar` / `taos-rs` / `taos-ws` / `clickhouse` / `ch` / `iotdb`
(这几种 URL 形态一致,`//host:port/db`,共用同一段解析)。

**不在清单里的引擎会在 `addSystem` 里抛 `Invalid JDBC url.`** —— 症状是新建租户失败,
而不是查询报错。加新引擎时这里是必改点。

## 类型映射与建表两个坑

- **映射键统一小写**:`DATA_TYPE_MAPPING` 装载时对枚举名 `toLowerCase()`,手工补的别名
  (`string` / `varchar` / `jsonobject` / `datetime` / `text` …)也必须小写。
  写成 `jsonObject` / `DateTime` 会查不到映射
- **变长类型是否带长度由类型的 `quoted` 决定**,不再维护硬编码排除清单。
  新增数据类型时设对 `quoted` 就够了,不要再去找那份清单
- **标签列名取常量**(`TdsConstants.DEVICE_IDENTIFICATION` / `TS` / `EVENT_TIME` …):
  ClickHouse 与 IoTDB 的 `INSERT` **必须写列名**,与建表时不一致就报「列不存在」。
  TDengine 上手写字面量不会立刻出问题,切引擎后才炸 —— 所以一律走常量
