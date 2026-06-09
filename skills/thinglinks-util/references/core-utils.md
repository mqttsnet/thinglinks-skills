# 核心工具(thinglinks-core)

包 `com.mqttsnet.basic`。被全模块依赖,改动谨慎。

## SnowflakeIdUtil(`utils`)

64 位雪花(epoch 2022-01-01),线程安全(synchronized),时钟回拨抛异常,workerId/datacenterId 随机。

| 方法 | 返回 | 用途 |
| --- | --- | --- |
| `SnowflakeIdUtil.nextId()` | String(16 位) | 字符串 ID |
| `SnowflakeIdUtil.nextLong()` | long | **协议 mid 等数值字段(避免被序列化成字符串)** |
| `nextId(int n)` | String(≥16) | 指定位数 |
| `nextLongId()` | long | 完整 64 位 |

## LampJacksonModule(`jackson`) — 全局序列化定制

`SimpleModule`,Spring Boot 自动注册到 ObjectMapper。注册:

| 类型 | 序列化器 |
| --- | --- |
| LocalDateTime / LocalDate / LocalTime | 对应 Serializer(`yyyy-MM-dd HH:mm:ss` 等) |
| **`Long.class` / `Long.TYPE`** | **`ToStringSerializer`(Long→String)** |
| BigInteger / BigDecimal | `ToStringSerializer` |

> ⚠️ Long→String 是为防 JS 53 位精度丢失,但它**全局生效** → rule 的 JSON 响应里所有 Long 都变 String。这正是"规则脚本 payload 必须 `JSON.toJSONString` 让信封变成不透明字符串"的根因(见 cloud `rule-script.md` / `protocol-envelope.md`)。

## MqttTopicMatcher(`utils/topic`)

`static boolean match(String pattern, String topic)` / `static boolean matchAny(Collection<String> patterns, String topic)`。

| 规则 | 结果 |
| --- | --- |
| `match("a/b/c","a/b/c")` | true(equals 短路) |
| `match("","any")` | true(blank pattern 放行) |
| `match("any","")` | false(blank topic 不匹配) |
| `match("#","any/topic")` | true(`#` 匹配一切) |
| `match("a/+/c","a/x/c")` | true(`+` 单层) |
| `match("a/b/#","a/b")` | true(`#` 末尾) |
| `match("a/#/b",...)` | false(`#` 必须末尾) |

无 Pattern 编译/缓存,按 `/` 分段逐段比。配合 `TopicPlaceholders.replaceWithWildcard`(`${app_id}`/`${device_identification}` 等 → `+`)先替换占位符再匹配。

> ACL 用的是 link-biz 自己的 `AclMatcherUtil`(带优先级+Caffeine 缓存),不是这个;桥接/通用匹配才用 `MqttTopicMatcher`。

## HybridLogicalClockUtil(`utils`)— 混合逻辑时钟(HLC)

`public static long nextHlc()`,产出**严格单调递增**的 long,用作分布式事件的**因果排序键**(event-time LWW CAS 单调写),跨异步消费 / 乱序 / 抖动重连都保序。

- **编码**:`(物理毫秒 << 16) | 16 位逻辑计数器`(高 48 位毫秒 + 低 16 位计数器)。同一毫秒内多次调用靠低 16 位 `+1` 严格递增;物理时间推进则刷新高位、计数器归零;**时钟回拨**也靠 `+1` 续单调(绝不退步)。
- 线程安全:单个 `AtomicLong` + CAS 自旋,无锁。
- ⚠️ **严禁当时间戳**写入 datetime / 时序索引 —— 它不是毫秒值。要毫秒用 `System.currentTimeMillis()`;HLC **只用来比大小排因果**。

> 谁在用:cloud 上行事件 `BaseEvent.eventHlc = HybridLogicalClockUtil.nextHlc()`(因果序);broker 侧对应 BifroMQ 的 `event.hlc()`(见 `bifromq-plugin` skill)—— 二者都是"**先同步抓因果时钟,再异步处理**"。

## 其它常用

| 类 | 包 | 用途 |
| --- | --- | --- |
| `DateUtils` | `utils` | 日期格式常量(`DEFAULT_DATE_TIME_FORMAT` 等)+ 多格式 Map;返回 `java.time.*` |
| `JsonUtil` / `JsonCoreUtils` | `jackson` | `toJson` / `parse(content, Class/TypeReference)` |
| `Sm3Utils` / `Sm4Utils` | `utils/sm` | 国密 SM3 哈希 / SM4 加密(CBC+PKCS5,HEX) |
| `AesUtils` / `AESEncryptor` | `utils/aes`,`secure` | AES(CBC+PKCS5,key 16/24/32) |
| `SHA256Utils` / `Base64Utils` | `utils` | 哈希 / 编码 |
| `EncryptKeyManager` | `secure/config` | 统一密钥/IV 配置(`EncryptKeyProperties`) |
| `SpringUtils` / `ContextUtil` / `TenantUtil` | `utils`,`context` | Bean 获取 / 上下文 / 租户 |
| `Constants` | `constant` | `PROJECT_PREFIX = "thinglinks"` |
| `TreeUtil` / `CollHelper` / `StrUtils` / `ArgumentAssert` | `utils` | 树 / 集合 / 字符串 / 断言 |
