# databridge-starter(北向桥接通用层)

`com.mqttsnet.basic.databridge.*`。cloud 侧 `rule-biz-bridge`(桥接规则引擎)的 SPI 底座。开关:`thinglinks.databridge.enabled`(缺省开);全部 bean `@ConditionalOnMissingBean`,业务可替换任一实现。

## SPI 四件

| 接口 | 关键方法 | 说明 |
| --- | --- | --- |
| `Sink` | `ConnectorType type()`;`SendResult send(ConnectorPayload, ConnectorConfig)` | 出方向:一个目标协议一个实现 |
| `Source` | `type()`;`void start(ConnectorConfig, Consumer<SourceMessage>)` | 入方向:回调式投递 |
| `Serializer` | 策略名与 `ConnectorConfig.getSerialization()` 匹配 | 载荷序列化 |
| `SinkErrors` | — | 错误归类 |

发现机制:`ConnectorRegistry(List<Sink>, List<Source>, List<Serializer>)` —— **Spring 注入全部 bean,按 `ConnectorType` / 序列化名建索引**;新增实现 = 写实现类 + 注成 bean,零改注册代码。连接复用走 `ConnectionPoolManager`。

## 内置覆盖矩阵

- **Sink ×19**:JDBC 族共用 `AbstractJdbcSink`(mysql / postgresql / clickhouse / dm / kingbase / influxdb / iotdb / tdengine)· MQ 族(kafka / rocketmq / rabbitmq / pulsar / mqtt)· http / webhook / redis / mongodb
- **Source ×3**:http / kafka / mqtt
- **Serializer ×4**:json / string / binary / avro
- 命名常量:`BridgeNamingConstant`;模型:`ConnectorConfig` / `ConnectorType` / `ConnectorPayload` / `SourceMessage` / `SendResult`

## 扩展一个新 Sink(最短路径)

1. 实现 `Sink`,`type()` 返回新增的 `ConnectorType` 枚举值;
2. 声明为 Spring bean(或在业务侧 @Bean 覆盖同 type 默认实现);
3. cloud 侧桥接规则选择该 ConnectorType 即生效——路由、序列化、执行轨迹(`rule_bridge_execution_trace/step`,按 `(traceId, ruleId)` 唯一防 MQ 重投)由引擎层处理。
