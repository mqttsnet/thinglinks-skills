---
name: thinglinks-util
description: >
  Use when working on ThingLinks framework foundation modules in thinglinks-util-pro:
  protocol envelopes, Groovy execution, cache and locks, Kafka or RocketMQ,
  databridge, sensitive-field encryption, shared core utilities, or Maven
  version/build/release maintenance. Trigger especially for changes with
  cross-service serialization, security, context propagation, ordering, or
  compatibility impact.
---

# ThingLinks Util

`thinglinks-util-pro` 是 ThingLinks 的框架底座检出目录，公共 Maven 身份为
`com.mqttsnet.basic:thinglinks-util`。目录后缀不是 Maven 坐标或发行版本。

## 重点模块

| 模块 | 关键能力 |
| --- | --- |
| `thinglinks-protocol-starter` | 协议信封编解码、签名、SM4/AES、topic 变量提取 |
| `thinglinks-groovy-engine-starter` | 脚本编译执行、Binding、热加载缓存、编译期安全限制 |
| `thinglinks-cache-starter` | Redis/Caffeine、typed cache-aside、List 缓存、锁 |
| `thinglinks-kafka-starter` | 带 key 发送、事务 opt-in、DLT 消费 |
| `thinglinks-rocketmq-starter` | 发送封装、LocalMap 上下文透传、租户感知消费 |
| `thinglinks-databridge-starter` | Sink/Source/Serializer SPI 与连接复用 |
| `thinglinks-core` | ID、Jackson、topic、HLC、敏感字段加密、通用工具 |

协议信封的业务结构见 `thinglinks-cloud`；本 skill 关注底座实现与跨服务契约。

## 工作规则

1. 先确认改动属于哪个 starter，并检查下游序列化、安全、租户上下文和兼容性影响。
2. 从根聚合工程构建；需要让下游消费本地改动时执行 `mvn install`，不能只编译子模块。
3. 版本修改走产品配置脚本，禁止分别手改 Parent/BOM 的 `revision`。
4. 发布必须显式启用 release profile，签名与仓库凭据始终保留在仓库之外。

## 关键边界

- `SnowflakeIdUtil.nextId()` 会把完整雪花值取模成 16 位字符串；不能用于要求硬性全局唯一的主键。协议 `mid` 等数值字段使用 `nextLong()`。
- `LampJacksonModule` 将 `Long`、`long`、`BigInteger`、`BigDecimal` 全局序列化为字符串。
- `HybridLogicalClockUtil.nextHlc()` 只保证当前 JVM 内单调；它不是毫秒时间戳，也不是带跨节点合并的完整 HLC。
- List 缓存必须使用 `getOrLoadList` / `hGetOrLoadList`；同一 key/field 不得与单对象 API 混用。
- `ENC@` 敏感字段只能成功解密或抛错；禁止在加解密失败后回退明文或原值。
- AES 使用 CBC + PKCS5Padding、HEX；key 为 16/24/32 字节，IV 固定 16 字节。
- Groovy 限制是同 JVM 内的纵深防御，不是执行不可信脚本的强隔离沙箱。
- `RocketmqTemplate.getRaw()` 不自动注入 LocalMap header；需要上下文时使用封装 API 或先构造带 header 的消息。

## References Index

| File | Content | When to read |
| --- | --- | --- |
| [references/protocol-codec.md](references/protocol-codec.md) | 协议信封编解码、签名与加解密 | 改协议适配、签名、SM4/AES |
| [references/groovy-engine.md](references/groovy-engine.md) | 执行、Binding、缓存与安全边界 | 改脚本引擎、绑定、热加载、沙箱 |
| [references/cache-starter.md](references/cache-starter.md) | 后端差异、typed cache-aside、List、锁 | 改缓存、降级、防穿透、并发控制 |
| [references/sensitive-field-encryption.md](references/sensitive-field-encryption.md) | `ENC@`、AES、MyBatis TypeHandler、fail-closed | 改敏感字段存取、密钥或错误处理 |
| [references/core-utils.md](references/core-utils.md) | ID、Jackson、topic、HLC、日期与通用工具 | 使用或修改 core 工具类 |
| [references/kafka-starter.md](references/kafka-starter.md) | 生产消费装配、带 key 发送、事务与 DLT | 发/消费 Kafka 消息 |
| [references/rocketmq-starter.md](references/rocketmq-starter.md) | opt-in 装配、上下文透传、租户消费 | 发/消费 RocketMQ 消息 |
| [references/databridge-starter.md](references/databridge-starter.md) | 桥接 SPI、自动发现与扩展 | 新增桥接目标或来源 |
| [references/build-release.md](references/build-release.md) | 产品配置、版本同步、构建与发布边界 | 改版本、安装上游工件、准备发布 |

## 相关 skill

- `thinglinks-cloud`：协议、规则、缓存、消息等底座能力的业务落地。
- `bifromq-plugin`：MQTT ACL topic 匹配与 broker 事件因果序。
