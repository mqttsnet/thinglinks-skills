# 扩展点(上行三层 + bus SPI)

上行处理由粗到细三层扩展;详见 `thinglinks-mqs/README.md` 第 10 节。

## 上行三层扩展

| 层 | 选择 | 说明 |
| --- | --- | --- |
| 动作级 | biz `DeviceEventProcessor`(放 `event/processor/`) | 按 actionType(PUBLISH/CONNECT/CLOSE…),一个 actionType 一个,**不改 dispatcher** |
| topic 级 | biz `TopicHandler`(放 `uplink/handler/`,可继承 `AbstractMessageHandler`) | PUBLISH 内按 topic 正则路由(厂商私有上报链路);见 `topic-handler.md` |
| 无代码级 | 规则脚本前置转换 | 把私有报文翻译成标准 datas;见 `rule-script.md` |

运行链路:`DevicePublishProcessor → InboundScriptTransformer.resolveEventSource(规则脚本/未命中透传) → TopicHandlerFactory.findMatchingHandler(topic) → handler.handle()`。规则脚本 opt-in:未命中即原样透传,`TopicHandler` 照常按原 topic 命中。

## bus SPI(mqs-entity `com.mqttsnet.thinglinks.bus.{adapter,stage,hook,route}`)

| 需求 | 选择 | 关键约束 |
| --- | --- | --- |
| 接新协议(CoAP…) | `ProtocolEdgeAdapter` + `@TopicRoute` + `*KafkaInboundConsumer` | 协议归一,topic 路由 |
| 新传输旁路(MQ/指标) | `DeviceEventStage`(POST,放 `stage/`) | best-effort,registry 自动收集 |
| 全局准入/黑名单 | `DeviceEventInterceptor` | `DeviceEventDropException` 终止 |
| 新横切(限流/审计) | biz `DeviceEventHook`(放 `event/hook/impl/`) | 按 order 自动触发 |
| 接新 Kafka topic(已有协议) | 扩 `@TopicRoute.value` + `@KafkaListener(topics)` | parser map 加映射 |

## 选型口诀

- 只是"私有报文 → 标准 datas" → **规则脚本**(无代码,最快);
- 要整条 topic 独立处理/原生逻辑 → **TopicHandler**(Java);
- 新动作类型(非 PUBLISH) → **DeviceEventProcessor**;
- 旁路/横切(不改主链路) → **DeviceEventStage / DeviceEventHook**;
- 新协议接入 → **ProtocolEdgeAdapter + @TopicRoute**。

## 跨仓库联动(改 mqs 注意同步)

- `DeviceActionTypeEnum` 增删改 → bifromq-plugin-pro `EventTypeEnum` + DBA 字典 SQL + rule 规则 JSON + mqs README 第 7 节;
- Kafka topic 新增 → EdgeAdapter `@TopicRoute` + KafkaInboundConsumer;
- `BridgeMessageEnvelope` 字段 → `BridgeRelayStage.toEnvelope` + rule 端解析。
