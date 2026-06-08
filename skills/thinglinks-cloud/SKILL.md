---
name: thinglinks-cloud
description: >
  Use when developing on the ThingLinks IoT platform (com.mqttsnet.thinglinks): writing
  Groovy device-uplink pre-transform rule scripts (规则脚本), building the ThingLinks
  protocol envelope (head/dataBody/dataSign, cipherFlag), adding a custom uplink
  TopicHandler, issuing downlink commands (DeviceCommandService / ProtocolMessageAdapter
  buildResponse), aligning a thing-model (services/properties/datatype/enumlist), reading
  device/product cache (LinkCacheDataHelper, DeviceCacheVO, productModel), persisting
  device data to TDengine + device shadow, configuring ACL publish authorization or MQTT
  topic matching, extending the uplink bus (DeviceEventProcessor / DeviceEventStage /
  DeviceEventHook / TopicHandler), or troubleshooting why uplink data does not land in the
  device shadow or time-series. Trigger whenever the user mentions ThingLinks, 规则脚本,
  设备上行/下行, 物模型, 设备影子, or the mqs/rule/link/broker modules — even without "ThingLinks".
---

# ThingLinks IoT Platform Development

ThingLinks 是一套多模块物联网平台,技术栈 **Spring Cloud + BifroMQ(MQTT broker)+ Kafka + TDengine + Redis + Vue3**。代码包名 `com.mqttsnet.thinglinks`。

## 模块速览

| 模块 | 职责 |
| --- | --- |
| `thinglinks-broker` | MQTT/WS 接入层(BifroMQ 插件、ACL 发布鉴权、WS 端点) |
| `thinglinks-mqs` | 消息处理核心:bus 管道、上行 handler 路由、规则脚本前置转换、落库 |
| `thinglinks-rule` | 规则引擎 + Groovy 脚本执行(GroovyScriptService、ScriptLogCollector) |
| `thinglinks-link` | 设备/产品/物模型业务、缓存、下行命令(DeviceCommandService) |
| `thinglinks-public` / common | 公共依赖、常量、网关、鉴权 |
| `thinglinks-util-pro`(独立框架仓) | 共享基建:`groovy-engine-starter`、`protocol-starter`(信封编解码/签名)、`thinglinks-core`(SnowflakeIdUtil、LampJacksonModule、MqttTopicMatcher) |

前端仓:`thinglinks-web-pro`(Vue3 + Vben + Ant Design Vue)。

## 上行 / 下行链路(一句话)

- **上行**:设备 PUBLISH → broker(ACL 鉴权)→ Kafka → `*KafkaInboundConsumer` → `BusPipelineDispatcher` → 边缘适配器归一 → `DeviceBizDispatchStage` → `DeviceEventDispatcher` → `DevicePublishProcessor` →(**规则脚本前置转换** `InboundScriptTransformer`)→ `TopicHandlerFactory` 按 topic 正则路由 → handler(如 `DeviceDatasHandler`)→ `DeviceDataProcessingService` 落 TDengine + 设备影子。
- **下行**:`DeviceCommandService.buildAndSendMessage` → `buildCommandMessage`(序列化一次)→ `ProtocolMessageAdapter.buildResponse`(明文还原成对象塞 dataBody)→ broker 下发。

## 开发工作流

1. **接设备 / 改协议**:厂商私有报文 → 用**规则脚本**(无代码,见 `references/rule-script.md`)或**自定义 TopicHandler**(Java,见 `references/topic-handler.md`)翻译成平台标准 datas。
2. **对齐物模型**:`serviceCode` / 属性键 = 物模型 `serviceCode` / `propertyCode`,类型按 `datatype`(见 `references/thing-model.md`)。
3. **下发命令**:走 `DeviceCommandService`(见 `references/downlink-command.md`)。
4. **平台二开**:加 bus 扩展点 / handler(见 `references/extension-points.md`)。
5. **编译验证**:IDEA `build_project`(util-pro 改动需先装到本地仓);前端 `npx eslint --fix`。
6. **出问题**:按 4 道关排查(见 `references/troubleshooting.md`)。

## ⚠️ 重要:不要凭训练数据猜(反幻觉)

ThingLinks 的**信封字段名、序列化行为、handler 类名、缓存 VO 字段、命中规则**随版本演进。写代码前**先读下方对应 reference,并核对真实代码** `com.mqttsnet.thinglinks.*`。几个**最容易踩的硬约定**(细节见 references):

- 规则脚本 `payload` **必须 `JSON.toJSONString(...)` 返回**(否则 `LampJacksonModule` 把 Long 序列化成 String → 下游 `String cannot be cast to Long`)。
- `mid` 用 `SnowflakeIdUtil.nextLong()`(数值),**不要** `nextId()`(返回 String)。
- 脚本时间格式化用 `new SimpleDateFormat(...)`,**不要** `new Date().format(...)`(Groovy 引擎无该扩展)。
- 明文信封 `cipherFlag = 0`、`dataSign = ""`;dataBody 是 JSON **对象**不是转义串。
- 下行命令**只序列化一次**(`buildCommandMessage` 已 `toJSONString`,别再 `.map(JSON::toJSONString)`)。
- ACL 发布主题要被放行(默认 `/#` 需**前导 `/`**),否则 broker 断连。
- 转换命中三要素:**渠道 + 版本(=设备绑定版本)+ 主题模式**,缺一不命中(调试台不校验这三项)。

## References Index

| File | Content | When to read |
| --- | --- | --- |
| [references/rule-script.md](references/rule-script.md) | Groovy 上行前置转换脚本:输出契约、注入变量、转换范式、日志调试、自检清单 | 写/改规则脚本,把厂商报文翻译成标准 datas |
| [references/protocol-envelope.md](references/protocol-envelope.md) | ThingLinks 信封 head/dataBody/dataSign、cipherFlag、dataSign 加签、序列化坑 | 构造/解析平台标准报文,排查转义/类型问题 |
| [references/topic-handler.md](references/topic-handler.md) | 自定义上行 `TopicHandler`:`topicPattern()` 正则 + `handle()` 落库示例 | 厂商私有 topic 要走独立 Java 处理链路 |
| [references/extension-points.md](references/extension-points.md) | 上行三层扩展(DeviceEventProcessor / TopicHandler / 规则脚本)+ bus SPI | 给平台加新动作/旁路/横切/topic 处理 |
| [references/troubleshooting.md](references/troubleshooting.md) | 4 道关排查总流程 + 常见错误对照 + 日志锚点 | 上行不生效 / 影子无数据 / 脚本报错 |
| [references/uplink-pipeline.md](references/uplink-pipeline.md) | bus 管道全链路(consumer→dispatcher→stage→processor→handler)细节 | 看懂/改动上行链路本身 |
| [references/downlink-command.md](references/downlink-command.md) | 下行命令链路、buildResponse、单次序列化、OTA | 写设备下行命令 |
| [references/thing-model.md](references/thing-model.md) | 物模型结构 services/properties/datatype/enumlist、版本发布建表 | 对齐字段/类型,版本发布 |
| [references/cache.md](references/cache.md) | LinkCacheDataHelper / DeviceCacheVO / ProductCacheVO / productModel | 在 handler/脚本里取设备/产品/物模型缓存 |
| [references/device-data.md](references/device-data.md) | DeviceDataProcessingService 落库:TDengine 超表/子表 + 设备影子 | 落库流程、子表不存在排查 |
| [references/acl-topic-match.md](references/acl-topic-match.md) | ACL 发布鉴权 + MqttTopicMatcher(`#`、前导 `/` 规则) | topic 匹配 / ACL 断连 |
| _(前端控制台)_ | 脚本调试面板 / codemirror / i18n / 组件 → 见独立 skill **`thinglinks-web`** | 改 thinglinks-web-pro(Vue3) |
| [references/build-run.md](references/build-run.md) | 编译(IDEA build)、模块/跨仓库依赖、util-pro 联动、提交规范 | 构建、跨仓库改动 |

## Assets

`assets/rule-script/` — 规则脚本骨架(复制即改):
- `01-data-report.groovy` — 单服务 JSON 改名上报
- `02-multi-service.groovy` — 多服务 + config(extend_params)
- `03-non-json.groovy` — 文本/十六进制非 JSON 报文
