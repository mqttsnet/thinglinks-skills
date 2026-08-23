# 上行链路(bus 管道)

新老两套并存,**运行时 = 新 bus 桥接到老 DevicePublishProcessor**。bus 代码在 `thinglinks-mqs/thinglinks-mqs-biz-bus`,SPI 接口在 `thinglinks-mqs-entity`(`com.mqttsnet.thinglinks.bus.*`)。

## 全链路(MQTT/WS)

```
设备 PUBLISH
 → broker(BifroMQ,ACL 发布鉴权)
 → Kafka
 → *KafkaInboundConsumer                   (mqs,@KafkaListener + @TopicRoute)
 → BusPipelineDispatcher.dispatch(sourceTopic, rawSource)   PRE → CORE →(异步)POST
 → 边缘适配器 canonicalize                 (MqttDeviceDataEdgeAdapter → UplinkMessageEventSource / DeviceProtocolEvent)
 → DeviceBizDispatchStage (CORE,order 200)
 → DeviceEventDispatcher.dispatch          (按 actionType → DeviceEventProcessor)
 → DevicePublishProcessor.process
      ├─ InboundScriptTransformer.resolveEventSource   ← 规则脚本前置转换(未命中=原样透传)
      └─ TopicHandlerFactory.findMatchingHandler(topic) → handler.handle(source)
 → DeviceDatasHandler → DeviceDataProcessingService → TDengine + 设备影子
```

## 三相阶段(StagePhaseEnum)

| Phase | 语义 | 失败 |
| --- | --- | --- |
| PRE | 同步串行(canonicalize 前后准入/校验) | 失败**终止**主链路 |
| CORE | 同步串行(主链路必跑) | 失败**终止** |
| POST | 异步并发(旁路投递) | best-effort,不阻断 |

`DeviceEventStageRegistry` 启动时自动扫描所有 `DeviceEventStage` Bean,按 phase 分组、order 升序。准入用 `DeviceEventInterceptor`(`bus/hook`):`beforeCanonicalize` / `afterCanonicalize`,抛 `DeviceEventDropException` 终止。

## 现有 Stage(实测)

| Stage | Phase | Order | 作用 |
| --- | --- | --- | --- |
| `DeviceBizDispatchStage` | CORE | 200 | **bus↔biz 唯一桥**:装配 `CommonDeviceEvent` 委派 `DeviceEventDispatcher` |
| `BridgeRelayStage` | POST | 100 | 事件转 `BridgeMessageEnvelope` → RocketMQ(桥接) |
| `AlarmRealtimeRelayStage` | POST | 200 | 实时告警(PUBLISH/ERROR/DISPATCH_ERROR)→ RocketMQ |
| `DistributionResultStage` | POST | 300 | 下行分发失败回执(DISPATCH_ERROR) |
| `MetricStage` | POST | 900 | Redis 穿透指标计数(stage_executions) |

## 协议边缘适配器(ProtocolEdgeAdapter)

`AbstractProtocolEdgeAdapter`(entity)/ `AbstractKafkaEdgeAdapter`(bus,Kafka 消费端)。实现:`MqttDeviceDataEdgeAdapter`、`MqttLifecycleEdgeAdapter`、`TcpDeviceDataEdgeAdapter`、`TcpDistributionEdgeAdapter`、`TcpControlAckEdgeAdapter`、`TcpLifecycleEdgeAdapter`。`@TopicRoute` 决定 Kafka topic → 适配器路由。

## 绑定变量组装(ScriptBindingAssembler)

`assemble(deviceVO, productVO, productModel, topic, body, bodyHex, ...)` → 注入 originTopic/originBody/originBodyHex/clientId/deviceIdentification/productIdentification + device.* + product.* + productModel + config.*;`log`(ScriptLogCollector)由 rule 注入。版本解析:`device.boundProductVersionNo ?: product.activeVersionNo` → `LinkCacheDataHelper.resolveProductModelByVersionNo`。

> 阶段顺序/类名随版本演进 —— 改链路前核对 `com.mqttsnet.thinglinks.bus.*` / `mqs.bus.*`。扩展见 `extension-points.md`。
