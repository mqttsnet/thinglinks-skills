---
name: thinglinks-cloud
description: >
  Use when developing on the ThingLinks cloud platform (com.mqttsnet.thinglinks), across its
  core domains and governance surfaces. (1) IoT: Groovy device-uplink rule scripts (规则脚本), the protocol envelope
  (head/dataBody/dataSign, cipherFlag), custom uplink TopicHandler, downlink commands via
  DeviceDownlinkFacade, thing-model, device/product cache, TDengine + device shadow, ACL / MQTT
  topic matching, WS downlink broadcast, the uplink bus (DeviceEventProcessor / TopicHandler),
  产品版本发布编排 / 灰度名单 / 改绑 (publish orchestrator:FULL/CANARY/SHADOW 策略),
  设备版本切换与分布 (switchBoundProductVersion / version distribution),
  OTA 升级与物模型版本切换 (OtaModelVersionSwitcher).
  (2) System foundation: the reactive WebFlux gateway (Sa-Token auth, Nacos routing, Sentinel),
  oauth login/token (Sa-Token grant types), the system/base modules (Def* vs Base*), the
  boot/cloud Facade duality, `/inner/**` internal API governance, and the DATASOURCE_COLUMN multi-tenant model (dynamic datasource +
  created_org_id tenant line), product manifest rendering, MQ namespace derivation, and Nacos/Seata
  deployment namespaces. (3) Video: the GB28181 streaming platform (ZLMediaKit hooks, SIP,
  RTP). (4) Security/runtime governance: the AI/MCP service (thinglinks-ai: MCP credential filter, `/inner/mcp/**` downstream contract), TDS/TDengine SQL hardening, Groovy/SpEL/FreeMarker sandboxing,
  internal Feign endpoints, ACL cache/runtime debugging. Trigger whenever the user mentions ThingLinks, 规则脚本, 设备上行/下行, 物模型, 设备影子,
  网关/鉴权/Sa-Token, 多租户, `/inner`, 产品配置/版本号/MQ 命名空间/Nacos/Seata, TDS/TDengine 安全, MCP/AI 服务/内部接口, Groovy 沙箱, 流媒体/GB28181, 版本发布/灰度/影子, OTA 升级/版本切换, or the
  gateway/oauth/system/base/broker/mqs/rule/link/video modules — even without saying "ThingLinks".
---

# ThingLinks Cloud Platform Development

> 适用于 ThingLinks Cloud 后端源码树；具体工作区映射见 `thinglinks-workspace`。产品身份、发行信息和版本以根目录 `.thinglinks-product.env` 为准，不从检出目录名推断。

ThingLinks 云端是多模块平台,技术栈 **Spring Cloud(WebFlux 网关 + Sa-Token)+ BifroMQ(MQTT broker)+ Kafka/RocketMQ + TDengine + Redis + Nacos + Vue3**。包名 `com.mqttsnet.thinglinks`。**三大应用域:系统基础 / 物联网 IoT / 流媒体 video**,references 按域分目录。

## 模块速览(按域)

### 系统基础(`references/system/`)
| 模块 | 职责 |
| --- | --- |
| `thinglinks-gateway` | WebFlux 网关:Sa-Token 认证、Nacos 动态路由、Sentinel 限流、CORS、灰度 |
| `thinglinks-oauth` | 登录/令牌(Sa-Token:验证码/密码/短信/refresh) |
| `thinglinks-system` | 平台级 `Def*` 实体(租户/用户/客户端/应用·资源/字典/区域) |
| `thinglinks-base` | 租户级 `Base*` 业务(组织/员工/角色/字典/文件/消息/操作日志) |
| `thinglinks-public`(common/-config) | 共享属性·MQ 路由常量·缓存 key、鉴权放行表、Mybatis 租户/数据权限拦截器、动态数据源 |
| `thinglinks-sop-gateway` / `thinglinks-support` | 开放平台网关(ISV 签名)/ 监控 + XXL-Job 执行器 |
| `thinglinks-ai` | MCP Server:把平台与 IoT 数据以只读工具开放给外部 AI 客户端 |

### 物联网 IoT(`references/iot/`)
| 模块 | 职责 |
| --- | --- |
| `thinglinks-broker` | MQTT/WS 接入(BifroMQ 插件、ACL 鉴权、WS 端点)+ 下行传输(`DeviceDownlinkFacade`、WS 广播) |
| `thinglinks-mqs` | 上行核心:bus 管道、handler 路由、规则脚本前置转换、落库 |
| `thinglinks-rule` | 规则引擎 + Groovy 脚本执行 |
| `thinglinks-link` | 设备/产品/物模型业务、缓存、下行命令构造 |
| `thinglinks-tds` / `card` / `sdk` / `openapi` | 时序(TDengine)/ 物联卡 / 设备 SDK / 开放 API |

### 流媒体 video(`references/video/`)
| 模块 | 职责 |
| --- | --- |
| `thinglinks-video` | 独立 GB28181 视频平台(前置 ZLMediaKit/ABL,SIP/RTP,**与 IoT 模型独立**) |

> 框架仓(`com.mqttsnet.basic.*`:协议编解码、Groovy 引擎、core 工具、租户上下文/DB 插件)见 **`thinglinks-util`** skill；前端控制台见 **`thinglinks-web`** skill。

## References Index

### 系统基础
| File | Content | When to read |
| --- | --- | --- |
| [system/architecture.md](references/system/architecture.md) | 系统基础模块图 + **boot/cloud Facade 双实现**(与 IoT 下行 Facade 同范式) | 看系统基础全貌 / 改 facade |
| [system/gateway.md](references/system/gateway.md) | WebFlux 网关:Nacos 路由、Sa-Token 鉴权过滤器、Sentinel、CORS、放行表、sop-gateway | 改网关路由/鉴权/限流 |
| [system/auth.md](references/system/auth.md) | Sa-Token 登录/令牌、授权类型、登录流程、网关校验 + header 信任 | 改登录/认证/权限 |
| [system/multi-tenant.md](references/system/multi-tenant.md) | DATASOURCE_COLUMN:动态数据源 + `created_org_id` 列租户线 + 数据权限;Def* vs Base* | 改多租户/数据隔离 |
| [system/product-configuration.md](references/system/product-configuration.md) | 产品清单、版本渲染、MQ 路由派生、Nacos/Seata 运行命名空间、跨发行同步边界 | 改版本/产品配置/MQ 前缀/部署命名空间 |
| [system/ai-mcp-service.md](references/system/ai-mcp-service.md) | AI 服务(MCP)接入链路:网关凭证过滤器与 header 重写、下游 `/inner/mcp/*` 专用 controller、`XxxMcpResultVO`/Converter 分层、数据权限显式开 | 为 MCP 加下游接口 / 改凭证链路 |

### 安全治理
| File | Content | When to read |
| --- | --- | --- |
| [security/internal-api-governance.md](references/security/internal-api-governance.md) | `/inner/**` 内部 RPC、网关拒绝、Feign/header 透传、AnyUser→Inner 迁移检查 | 改内部接口/Feign 路径/网关放行表 |
| [security/tdengine-script-hardening.md](references/security/tdengine-script-hardening.md) | TDengine SQL `${}`/`#{}` 边界、TdsSqlGuard、Groovy/SpEL/FreeMarker 沙箱 | 修 TDS 注入/脚本表达式执行风险 |

### 物联网 IoT
| File | Content | When to read |
| --- | --- | --- |
| [iot/rule-script.md](references/iot/rule-script.md) | Groovy 上行前置转换:输出契约、注入变量、范式、调试、自检 | 写/改规则脚本 |
| [iot/protocol-envelope.md](references/iot/protocol-envelope.md) | 信封 head/dataBody/dataSign、cipherFlag、加签、序列化坑 | 构造/解析平台报文 |
| [iot/topic-handler.md](references/iot/topic-handler.md) | 自定义上行 `TopicHandler`:`topicPattern()` 正则 + `handle()` | 厂商私有 topic 走 Java 链路 |
| [iot/uplink-pipeline.md](references/iot/uplink-pipeline.md) | bus 管道全链路(consumer→dispatcher→stage→processor→handler) | 看懂/改上行链路 |
| [iot/downlink-command.md](references/iot/downlink-command.md) | 下行两层(业务构造 + `DeviceDownlinkFacade` 协议派发)、buildResponse、单次序列化、OTA | 写设备下行命令 |
| [iot/ws-downlink-broadcast.md](references/iot/ws-downlink-broadcast.md) | WS 下行广播:`WsDeviceSessionRegistry` + `BROADCASTING` 消费者 + 心跳/TTL | 改 WS 下行/多节点会话 |
| [iot/thing-model.md](references/iot/thing-model.md) | 物模型 services/properties/datatype/enumlist、版本发布建表 | 对齐字段/类型、版本发布 |
| [iot/product-version-publish.md](references/iot/product-version-publish.md) | 发布编排:FULL/CANARY/SHADOW 策略、灰度名单(去百分比)、整条记录幂等 rerun 重试、灰度期 previousFullVersionNo | 改发布编排/灰度/影子改绑/重试 |
| [iot/ota.md](references/iot/ota.md) | OTA 升级包 `product_version_no` 目标版本 + `OtaModelVersionSwitcher` 双触发迁绑;设备版本切换/分布原语(switchBoundProductVersion / countDeviceVersionDistribution) | 改 OTA 切版本 / 设备改绑原语 / 版本分布 |
| [iot/cache.md](references/iot/cache.md) | LinkCacheDataHelper / DeviceCacheVO / ProductCacheVO / productModel | handler/脚本里取缓存 |
| [iot/device-data.md](references/iot/device-data.md) | DeviceDataProcessingService 落库:TDengine 超表/子表 + 设备影子 | 落库流程、子表排查 |
| [iot/acl-topic-match.md](references/iot/acl-topic-match.md) | ACL 发布鉴权 + MqttTopicMatcher(`#`、前导 `/` 规则) | topic 匹配 / ACL 断连 |
| [iot/device-access.md](references/iot/device-access.md) | 设备接入:连接鉴权 / ACL 端点、clientId·凭证派生、WS/MQTT 接入、上行 topic→handler、上行帧 | 接设备 / 模拟上行测试 |
| [iot/extension-points.md](references/iot/extension-points.md) | 上行三层扩展(DeviceEventProcessor / TopicHandler / 规则脚本)+ bus SPI | 给平台加动作/旁路/topic |
| [iot/troubleshooting.md](references/iot/troubleshooting.md) | 4 道关排查 + 常见错误对照 + 日志锚点 | 上行不生效/影子无数据/脚本报错 |
| [iot/testing.md](references/iot/testing.md) | 测试 playbook:下发(`sendMqttCustomMessage`/`dispatch`)、脚本调试(`transformDebug`)、影子/TDengine/指令记录校验、端到端流 | 测试上下行 / 验证落库 |
| [iot/runtime-debugging.md](references/iot/runtime-debugging.md) | 连接认证 vs ACL、命令响应闭环、调试历史、路径/运行时定位 | 调运行时连接/ACL/命令响应/调试台问题 |

### 流媒体 video
| File | Content | When to read |
| --- | --- | --- |
| [video/video.md](references/video/video.md) | 总览:**biz-protocol 模块拆分**、域地图、表/缓存基线、点播流程、部署与多租户结论 | 视频域上手/找东西放哪 |
| [video/gb28181.md](references/video/gb28181.md) | 信令层:transmit 管线、**信令事件体系(38 类)**、cmd、SSRC/会话、级联、Gb2016/2022 适配 | 改信令处理/加联动 listener |
| [video/media-access.md](references/video/media-access.md) | ZLM hook 事件面、stream/record 域、**ISUP / JT1078** 接入、VendorProtocolAdapter、ONVIF | 接媒体回调/新协议/新厂商 |

### 通用
| File | Content | When to read |
| --- | --- | --- |
| [build-run.md](references/build-run.md) | 编译(IDEA build)、模块/跨仓库依赖、util-pro 联动、提交规范 | 构建、跨仓库改动 |

## 物联网核心:上行 / 下行 + 硬约定

> 系统基础的关键约束(令牌仅网关校验、下游信任 header;DATASOURCE_COLUMN 切库+列过滤;Sa-Token 非 JWT;`/inner/**` 只服务间直连)见 `system/*` 与 `security/*`;视频(独立平台、不走总线)见 `video/video.md`。下面是**最易踩坑的 IoT 上下行**。

产品身份、Cloud/Util 版本与 MQ 前缀只改 `.thinglinks-product.env` 后走 `product-config.sh`；`NACOS_NAMESPACE` / `SEATA_NAMESPACE` 是独立的部署变量。详见 `system/product-configuration.md`。

- **上行**:设备 PUBLISH → broker(ACL 鉴权)→ Kafka → `*KafkaInboundConsumer` → `BusPipelineDispatcher` → 边缘适配器归一 → `DeviceBizDispatchStage` → `DeviceEventDispatcher` → `DevicePublishProcessor` →(规则脚本前置转换 `InboundScriptTransformer`)→ `TopicHandlerFactory` 按 topic 正则路由 → handler → `DeviceDataProcessingService` 落 TDengine + 设备影子。
- **下行**:业务层 `buildCommandMessage`(序列化一次)→ `ProtocolMessageAdapter.buildResponse` → 传输层 `DeviceDownlinkFacade.dispatch(DownlinkCommand)`(boot 直调 / cloud Feign)→ `DeviceDownlinkDispatchService` 按协议选 sender(MQTT→BifroMQ / WS→RocketMQ 广播 / TCP 占位)。

### ⚠️ IoT 硬约定(反幻觉,细节见 `iot/*`)
- 规则脚本 `payload` **必须 `JSON.toJSONString(...)` 返回**(否则 `LampJacksonModule` 把 Long 序列化成 String → 下游 `String cannot be cast to Long`)。
- `mid` 用 `SnowflakeIdUtil.nextLong()`(数值),**不要** `nextId()`(返回 String)。
- 脚本时间格式化用 `new SimpleDateFormat(...)`,**不要** `new Date().format(...)`(Groovy 引擎无该扩展)。
- 明文信封 `cipherFlag=0`、`dataSign=""`;dataBody 是 JSON **对象**不是转义串。
- 下行命令**只序列化一次**(`buildCommandMessage` 已 `toJSONString`,别再 `.map(JSON::toJSONString)`)。
- ACL 发布主题要被放行(默认 `/#` 需**前导 `/`**),否则 broker 断连。
- 转换命中三要素:**渠道 + 版本(=设备绑定版本)+ 主题模式**,缺一不命中(调试台不校验这三项)。

## Assets

`assets/rule-script/` — 规则脚本骨架(复制即改):`01-data-report`(单服务改名)/ `02-multi-service`(多服务 + config)/ `03-non-json`(文本/十六进制)。
`assets/diagrams.md` — 上行 / 下行 / WS 广播 三张 Mermaid 架构图(GitHub 直接渲染)。

## 相关 skill

- **[`thinglinks-util`](../thinglinks-util/)** — 协议编解码、Groovy 引擎、HLC、core 工具、租户上下文/DB 插件的**实现**(`com.mqttsnet.basic.*`)。
- **[`thinglinks-web`](../thinglinks-web/)** — 前端控制台 / 规则脚本调试面板 / 物模型编辑。
- **[`bifromq-plugin`](../bifromq-plugin/)** — broker 侧 ACL/认证 + 事件采集(IoT 上行的源头,喂 mqs)。
- **[`thinglinks-ai`](../thinglinks-ai/)** —— MCP 工具怎么选怎么串、回答边界与排查工作流;以及 `thinglinks-ai` 模块内部怎么加工具。

---

> **最后核对**：类名、包名和配置契约随版本演进，落地前核对当前源码 `com.mqttsnet.thinglinks.*` 与根目录产品清单。
