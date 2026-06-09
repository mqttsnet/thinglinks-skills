# 架构图(Mermaid)

GitHub 可直接渲染。文字版细节见对应 reference;此处只给"一眼看全貌"的图。

## 上行链路(设备 → 影子/时序)

> 细节:`references/iot/uplink-pipeline.md`、`references/iot/rule-script.md`、`references/iot/device-data.md`

```mermaid
flowchart LR
  D[设备 PUBLISH] --> B[BifroMQ broker<br/>ACL 鉴权]
  B --> K[(Kafka)]
  K --> C["*KafkaInboundConsumer"]
  C --> DP[BusPipelineDispatcher]
  DP --> AD[边缘适配器归一]
  AD --> ST[DeviceBizDispatchStage]
  ST --> ED[DeviceEventDispatcher]
  ED --> PP[DevicePublishProcessor]
  PP --> RS["规则脚本前置转换<br/>InboundScriptTransformer"]
  RS --> TH["TopicHandlerFactory<br/>按 topic 正则路由"]
  TH --> H["DeviceDatasHandler 等"]
  H --> DD[DeviceDataProcessingService]
  DD --> TD[(TDengine 超表/子表)]
  DD --> SH[(设备影子)]
```

## 下行链路(业务构造 → DeviceDownlinkFacade → broker)

> 细节:`references/iot/downlink-command.md`

```mermaid
flowchart TB
  subgraph 业务层
    BC[buildCommandMessage<br/>序列化一次] --> BR[ProtocolMessageAdapter.buildResponse]
    BR --> TP[拼下行 topic]
    TP --> DC[DownlinkCommand]
  end
  DC --> F[DeviceDownlinkFacade.dispatch]
  F -->|boot 单体| DS[DeviceDownlinkDispatchService]
  F -->|cloud 微服务| FE["DeviceDownlinkApi @FeignClient<br/>thinglinks-broker-server"]
  FE --> CT[DeviceDownlinkController] --> DS
  DS -->|MQTT| MS[MqttDownlinkSender] --> MB[MqttBrokerService] --> BF[BifroMQ /pub]
  DS -->|WEBSOCKET| WSS[WebSocketDownlinkSender] --> WB[WebSocketBrokerService] --> RB[(RocketMQ 广播)]
  DS -->|TCP| TS[TcpDownlinkSender 占位]
```

## WS 下行广播(任意节点 → 持有节点 → 客户端)

> 细节:`references/iot/ws-downlink-broadcast.md`

```mermaid
flowchart TB
  P[任意节点 publishMessage] --> OC{在线?<br/>WsDeviceSessionRegistry.isOnline}
  OC -->|否| X[throw 设备不在线]
  OC -->|是| EN[编码一次 WS 帧]
  EN --> LF{本地持有?<br/>WebSocketSubject.Holder}
  LF -->|是| L[publishLocal → sendText ► 客户端]
  LF -->|否| BC[broadcast WsCommandBroadcastEvent]
  BC --> RMQ[(RocketMQ BROADCASTING<br/>thinglinks-ws-command-downlink)]
  RMQ --> N1[node-1 Listener<br/>不持有 → 忽略]
  RMQ --> N2[node-2 持有者 Listener<br/>publishLocal → sendText ► 客户端]
  RMQ --> N3[node-N Listener<br/>不持有 → 忽略]
```
