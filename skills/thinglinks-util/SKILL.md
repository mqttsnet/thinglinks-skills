---
name: thinglinks-util
description: >
  Use when working on the ThingLinks framework foundation repo thinglinks-util-pro
  (com.mqttsnet.basic): the protocol-starter (ProtocolMessageAdapter / envelope encode
  & decode / SM4 & AES encryption / SHA256 dataSign / EncryptionDetailsDTO), the
  groovy-engine-starter (EngineExecutor / ExecuteParams binding / GroovyCompiler /
  ScriptRegistry hot-reload cache), or thinglinks-core utilities (SnowflakeIdUtil,
  LampJacksonModule Long-to-String serialization, MqttTopicMatcher, TopicPlaceholders,
  DateUtils, JsonUtil, Sm3/Sm4/AES crypto). Trigger whenever the user touches the protocol
  envelope codec, the Groovy script engine internals, or shared util classes — especially
  changes with global blast radius (Jackson serialization, snowflake IDs, topic matching).
---

# ThingLinks Util (framework foundation)

`thinglinks-util-pro` 是被各业务模块依赖的**独立框架仓**,包名 `com.mqttsnet.basic`。改动是**全局行为**,影响所有下游(cloud 的 broker/mqs/rule/link 都依赖它)。

## 模块

| 模块 | 职责 |
| --- | --- |
| `thinglinks-protocol-starter` | ThingLinks 协议信封**编解码**:`ProtocolMessageAdapter` + 加解密(SM4/AES)+ 签名(SHA256)+ topic 变量提取 |
| `thinglinks-groovy-engine-starter` | Groovy 脚本**编译 + 执行**引擎:`EngineExecutor`、热加载缓存、脚本注册表 |
| `thinglinks-core` | 通用工具:`SnowflakeIdUtil`、`LampJacksonModule`、`MqttTopicMatcher`、`DateUtils`、`JsonUtil`、SM3/SM4/AES、常量 |

> 协议**信封结构**(给设备/规则脚本用)在 `thinglinks-cloud` skill 的 `protocol-envelope.md`;本 skill 讲**编解码实现**。

## 工作流

1. 改动前想清**爆炸半径**:`LampJacksonModule`/`SnowflakeIdUtil`/`MqttTopicMatcher` 一改,所有依赖模块行为变。
2. 编译后 **`mvn install` 到本地仓**,主库才拉得到新版本(否则用旧 jar)。
3. 各 starter 自动配置可由开关控制(如 `thinglinks.groovy.engine.enable=true`)。

## ⚠️ 重要(反幻觉)

- `SnowflakeIdUtil.nextId()` 返回 **String(16 位)**;`nextLong()` 返回 **long** —— 协议里 mid 要数值就用 `nextLong()`。
- `LampJacksonModule` 把 **`Long.class` / `Long.TYPE` / BigInteger / BigDecimal 全局序列化成 String**(防 JS 精度丢失)—— 这是"规则脚本 payload 必须 `JSON.toJSONString`"的根因。
- `MqttTopicMatcher`:`#` 匹配一切、`/#` 须前导 `/`、`#` 须在末尾、blank pattern 放行、blank topic 不匹配。
- 加解密统一 **CBC + PKCS5Padding**,密文走 **HEX**;密钥/IV 16/24/32 字节。
- `HybridLogicalClockUtil.nextHlc()` 是**因果排序键**(`物理ms<<16 | 16位计数器`),严格单调;**不是时间戳**,别写进 datetime/时序索引。
- 类名/方法签名随版本演进,核对真实代码 `com.mqttsnet.basic.*`。

## References Index

| File | Content | When to read |
| --- | --- | --- |
| [references/protocol-codec.md](references/protocol-codec.md) | `ProtocolMessageAdapter`、`encryptMessage`/`decryptMessage`、cipherFlag、dataSign、Sm4/Aes、DTO | 编/解协议信封,改加解密/签名 |
| [references/groovy-engine.md](references/groovy-engine.md) | `EngineExecutor`、`ExecuteParams` 绑定、`GroovyCompiler`、`ScriptRegistry` 缓存、结果/状态 | 改脚本引擎、绑定变量、热加载 |
| [references/core-utils.md](references/core-utils.md) | `SnowflakeIdUtil`、`LampJacksonModule`、`MqttTopicMatcher`、`HybridLogicalClockUtil`(HLC)、`TopicPlaceholders`、`DateUtils`、`JsonUtil`、crypto | 用/改 core 工具类 |

## 相关 skill

- **[`thinglinks-cloud`](../thinglinks-cloud/)** — 这些工具的**业务落地**(信封 head/dataBody、规则脚本 payload 坑、下行单次序列化、HLC 事件因果序)。
- **[`bifromq-plugin`](../bifromq-plugin/)** — ACL 复用 `MqttTopicMatcher`,事件侧用 `event.hlc()`(对应本 skill 的 `HybridLogicalClockUtil`)。

---

> 📌 **最后核对**:`thinglinks-util-pro` · 2026-06-08。类名/方法签名随版本演进,落地前请核对真实代码 `com.mqttsnet.basic.*`。
