---
name: bifromq-plugin
description: >
  Use when developing the ThingLinks BifroMQ MQTT broker plugins repo bifromq-plugin-pro
  (com.mqttsnet.thinglinks, BifroMQ 3.3.5 SPI): the auth-provider plugin (IAuthProvider —
  device connect authentication + publish/subscribe ACL with fast-path metadata rules,
  HTTP fallback, Caffeine cache, MqttTopicMatcher + placeholder replacement), the
  event-collector plugin (IEventCollector — report() → EventTypeEnum → Kafka topics feeding
  mqs, connect/close/kicked/ping/sub/pub/dist events), the setting-provider plugin
  (ISettingProvider, -Dsetting_provide_init_value=true), or the resource-throttler plugin
  (IResourceThrottler). Trigger whenever the user works on BifroMQ auth/ACL, device
  connect/disconnect events, the EventTypeEnum ↔ DeviceActionTypeEnum mapping, Kafka event
  topics, or deploying plugins into BifroMQ (standalone.yml FQN).
---

# BifroMQ Plugin (broker plugins)

`bifromq-plugin-pro`:ThingLinks 给 **BifroMQ**(MQTT broker)写的插件库。Maven + Java 17,BifroMQ **3.3.5**(包 `com.baidu.bifromq.*`;升 4.0 要换成 `org.apache.bifromq.*`)。包名 `com.mqttsnet.thinglinks`。

## 四个插件(各实现一个 BifroMQ SPI)

| 插件 | BifroMQ SPI | 职责 |
| --- | --- | --- |
| `bifromq-auth-provider-plugin` | `IAuthProvider` | 设备认证(账号/证书)+ 发布/订阅 **ACL** |
| `bifromq-event-collector-plugin` | `IEventCollector` | 采集 BifroMQ 事件 → 映射 → 写 **Kafka**(喂 mqs) |
| `bifromq-setting-provider-plugin` | `ISettingProvider` | 运行时租户级配置(同步只读内存) |
| `bifromq-resource-throttler-plugin` | `IResourceThrottler` | 多租户资源限流 |

## 它在平台里的位置

```
设备 ── MQTT ──> BifroMQ ──(本插件)──> ① IAuthProvider 认证+ACL  ──HTTP──> thinglinks-link(:18760 deviceOpen)
                              └──────> ② IEventCollector 事件 ──Kafka──> thinglinks-mqs(上行/连接/断开…)
```
即:**broker 侧的"门卫(ACL/认证)+ 事件出口(Kafka)"**。上行业务在 mqs(见 `thinglinks-cloud` skill),这里是它的**源头**。

## ⚠️ 重要(反幻觉/部署铁律)

- **BifroMQ 版本 3.3.5**:包名 `com.baidu.bifromq.*`;别按 4.0(`org.apache.bifromq.*`)写。
- **`-Dsetting_provide_init_value=true` 必须加**到 BifroMQ 启动参数,否则 setting-provider 配置全失效(且 `PING_REQ` 心跳采集不到)。
- ACL 决策**禁止阻塞 BifroMQ event loop**:CPU 工作丢 executor、HTTP 用异步、结果走 Caffeine 缓存。
- 事件 `report()` 入口**同步抓 `event.hlc()` + `event.utc()`** 保因果顺序,再异步处理。
- ACL 通配/占位符复用 util 的 `MqttTopicMatcher` + `AclTopicPatternPlaceholderReplacer`(`{deviceId}`/`{productId}`/`{clientId}`)。
- 类名/行号随版本演进,核对真实代码 `com.mqttsnet.thinglinks.*`。

## References Index

| File | Content | When to read |
| --- | --- | --- |
| [references/auth-acl.md](references/auth-acl.md) | `IAuthProvider`:认证流程、ACL 快/慢路径、缓存、占位符 | 改设备认证 / 发布订阅鉴权 |
| [references/event-collector.md](references/event-collector.md) | `IEventCollector`:report→EventType→Kafka topic、`EventTypeEnum` 映射 | 改事件采集 / Kafka topic / 新增事件 |
| [references/setting-throttler.md](references/setting-throttler.md) | `ISettingProvider` + `IResourceThrottler` + `-D` 开关 | 改运行时配置 / 限流 |
| [references/deploy-config.md](references/deploy-config.md) | 构建打包、config.yaml、装进 BifroMQ(standalone.yml FQN) | 部署 / 配置 |

## Assets

`assets/standalone-register.yml` — BifroMQ `standalone.yml` 四插件 FQN 注册 + `-Dsetting_provide_init_value=true` 提示(复制即用)。

## 相关 skill

- **[`thinglinks-cloud`](../thinglinks-cloud/)** — mqs 消费本插件采集的事件(连接/断开/上行),下行经 broker 投递。
- **[`thinglinks-util`](../thinglinks-util/)** — ACL 复用 `MqttTopicMatcher`;事件因果时钟对应 `HybridLogicalClockUtil`。

---

> 📌 **最后核对**:`bifromq-plugin-pro`(BifroMQ 3.3.5)· 2026-06-08。类名/行号随版本演进,落地前请核对真实代码 `com.mqttsnet.thinglinks.*`。
