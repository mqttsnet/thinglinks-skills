# 事件采集(event-collector-plugin)

`IEventCollector` 实现:`BifromqEventCollectorPluginEventProvider`(`bifromq-event-collector-plugin/event-provider`,行 57)。把 BifroMQ 事件转成平台设备动作,写 Kafka 喂 mqs。

## 流程

`report(Event<?>)`(行 138):
1. **同步**抓 `event.hlc()` + `event.utc()`(保因果顺序);
2. 投递 **64 worker TaskQueue**(异步);
3. `EventProcessorFactory`(行 78)按 `EventType` 找 processor;
4. processor 产 Kafka 消息(`KafkaMessageSender`,行 38)。

`TOPIC_MAP`(行 70)= BifroMQ `EventType` → Kafka topic。**TOPIC_MAP 与 ProcessorFactory 缺一个都 warn 丢弃**(启动期可审计覆盖率)。

## EventTypeEnum(`event-plugin-context`,行 62)

字段:`value`(BifroMQ EventType)、`businessSystemEventType`(映射 mqs `DeviceActionTypeEnum`)。当前 29 项,关键映射:

| BifroMQ EventType | → 业务动作 | Kafka topic |
| --- | --- | --- |
| `CLIENT_CONNECTED` | CONNECT | `mqtt.client.connected.topic` |
| `BY_CLIENT` | DISCONNECT | `mqtt.client.disconnect.topic` |
| `KICKED` | KICKED(同 clientId 抢占) | `mqtt.device.kicked.topic` |
| 18 个被动断(`IDLE`/`BAD_PACKET`/`PROTOCOL_VIOLATION`/`NO_PUB_PERMISSION`/`EXCEED_PUB_RATE`/`BY_SERVER`…) | CLOSE | `mqtt.server.disconnect.topic` |
| `PING_REQ` | PING(→ last_heartbeat_time) | `mqtt.ping.req.topic` |
| `SUB_ACKED` / `UNSUB_ACKED` | SUBSCRIBE / UNSUBSCRIBE | `mqtt.subscription.acked.topic` / `mqtt.unsubscription.acked.topic` |
| `DISTED` | PUBLISH(**上行设备数据来源**) | `mqtt.distribution.completed.topic` |
| `DIST_ERROR` | DISPATCH_ERROR(下行投递失败) | `mqtt.distribution.error.topic` |
| `NOT_AUTHORIZED_CLIENT` / `MQTT_SESSION_START` / `MQTT_SESSION_STOP` | (审计,空) | `mqtt.client.unauthorized` / `mqtt.session.start` / `mqtt.session.stop` |

> 上行设备数据(`DISTED`→PUBLISH)进 `mqtt.distribution.completed.topic` → mqs 的 `*KafkaInboundConsumer` 消费(见 `thinglinks-cloud` 的 `uplink-pipeline.md`)。

## 新增一种事件

1. `EventTypeEnum` 加项(value + businessSystemEventType);
2. `TOPIC_MAP` 加映射 + 写对应 processor;
3. **跨仓同步**:mqs `DeviceActionTypeEnum`(若是新业务动作)+ DBA 字典 + rule 规则 JSON(见 `thinglinks-cloud` 的 `extension-points.md` / mqs README 第 7 节)。

## Kafka 生产配置

`EventCollectorConfig`:`kafka.bootstrapServers`、`producer.acks`(1,at-least-once)、`compressionType`(lz4)、`batchSize`(128KB)、`lingerMs`(20)、`bufferMemory`(256MB)。
