# 规则脚本(设备上行前置转换 · Groovy)

把**厂商任意私有报文**翻译成**平台标准 ThingLinks 信封**,再交平台标准链路入库/展示。脚本类型 = 设备上行前置转换;语言 = Groovy(JVM)。

## 输出契约(最重要)

脚本必须返回二元结构:
```groovy
return [topic: "<平台标准主题>", payload: "<信封 JSON 字符串>"]
```
- `topic` 固定 `"/v1/devices/" + deviceId + "/datas"`(`deviceId` 用注入的 `deviceIdentification`)。
- `payload` **必须 `JSON.toJSONString(payload)` 序列化成字符串**(原因见下「数值序列化」)。

## 注入的绑定变量(直接用,无需声明)

| 变量 | 类型 | 说明 |
| --- | --- | --- |
| `originTopic` | String | 设备上报源主题 |
| `originBody` | String | 原始报文(文本/JSON 串) |
| `originBodyHex` | String | 原始报文十六进制(二进制/非 JSON 无损) |
| `deviceIdentification` | String | 平台设备标识(输出用它) |
| `productIdentification` | String | 产品标识 |
| `clientId` | String | 客户端 ID |
| `device` | 对象 | 设备档案:`device.signKey` / `device.encryptMethod`(0/1/2) / `device.fwVersion` / `device.boundProductVersionNo`(无密码) |
| `product` | 对象 | 产品档案:`product.protocolType` / `product.dataFormat` |
| `productModel` | 对象 | 该版本物模型:`productModel.services[].properties[].propertyCode` |
| `config` | 对象 | 扩展参数(extend_params)解析结果:`config.XXX` |
| `log` | 对象 | 日志器:`log.info/warn/debug/error("...")`(回显调试台「执行日志」,运行时进 logger `groovy.script`,上限 200 行) |

对象类一律安全导航 `?.`。

## 运行时可用类库

| 类 | 用途 |
| --- | --- |
| `com.alibaba.fastjson2.JSON` | `JSON.parseObject` / `JSON.toJSONString`(**首选**) |
| `com.mqttsnet.basic.utils.SnowflakeIdUtil` | `nextLong()` 数值雪花 ID(给 `mid`) |
| `cn.hutool.core.util.HexUtil` | `decodeHex` / `encodeHexStr` |
| `org.apache.commons.codec.digest.DigestUtils` | `sha256Hex(...)` 算 dataSign |
| `java.text.SimpleDateFormat` | 时间格式化(DateTime 属性) |

> ⚠️ **时间格式化用 `new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(ts))`,不要 `new Date(ts).format(...)`** —— 引擎未带 Groovy GDK `Date.format` 扩展,会运行期 `MissingMethodException`。

## ⚠️ 数值序列化(必须 toJSONString)

`mid` / `timeStamp` / `eventTime` 是 Long。若**直接返回 payload 的 Map**,平台内部 `LampJacksonModule`(`com.mqttsnet.basic.jackson`)按防 JS 精度策略把 **Long 序列化成 String**,下游协议解析强转报错 `class java.lang.String cannot be cast to class java.lang.Long`。
**做法**:`payload: JSON.toJSONString(payload)` —— 整个信封作为 String 透传,数值保真。`mid` 用 `SnowflakeIdUtil.nextLong()`(数值),不用 `nextId()`(String)。

## 转换范式

```groovy
// 改名
def data = [battery: raw.getInteger("b"), play_mode: raw.getString("mode")]
// 布尔(containsKey 区分"未上报"与"0")
charging: raw.containsKey("chg") ? raw.getInteger("chg") == 1 : null
// 枚举映射
online_status: ["0":"OFFLINE","1":"ONLINE"][raw.getString("st")] ?: "OFFLINE"
// 换算/缺省
battery_temperature: raw.getInteger("temp") * (config?.TEMP_RATIO ?: 0.1)
// 文本分隔
def parts = (originBody ?: "").split(",")        // "25.6,60"
// 十六进制(越界守卫)
def bytes = originBodyHex ? HexUtil.decodeHex(originBodyHex) : (originBody ?: "").getBytes("UTF-8")
def b0 = bytes.length > 0 ? (bytes[0] & 0xFF) : null
// 只上报有值(避免污染影子)
def clean = { Map m -> m.findAll { k, v -> v != null } }
```

`config`(extend_params)= 把"会变的旋钮"(阈值/系数/开关/映射表)外置,改配置不动脚本。

## 物模型对齐

`services[].serviceCode` = 物模型 `serviceCode`;`data` 的键 = `propertyCode`;值类型按 `datatype`(string/int/decimal/bool/DateTime/jsonObject/枚举)。没上报的属性**不要输出**。

## 命中三要素(运行时,缺一不命中;调试台不校验)

1. **渠道** = 设备接入方式(`mqtt`/`webSocket`);2. **版本** = 设备绑定的产品版本;3. **主题模式**能匹配上行 topic(裸报文平台兜底 `#`,主题模式要设 `#`)。
> 命中标志:mqs 日志 `[InboundTransform] applied ... -> /v1/devices/.../datas`。

## 最小骨架

见 `assets/rule-script/01-data-report.groovy`。完整示例与信封字段见 `references/protocol-envelope.md`;排查见 `references/troubleshooting.md`。

## 自检清单

- [ ] `import` fastjson2.JSON、SnowflakeIdUtil(及 HexUtil/DigestUtils/SimpleDateFormat)
- [ ] `mid` 用 `nextLong()`;`timeStamp`/`eventTime` 毫秒数值
- [ ] `cipherFlag` 明文填 `0`;`dataSign` 留空
- [ ] `return [topic, payload]` 且 **payload 用 `JSON.toJSONString`**
- [ ] `serviceCode`/`data` 键与物模型一致;只上报有值字段
- [ ] 时间用 `SimpleDateFormat`;全程 `?.`/`?:` null 安全
- [ ] 关键步骤 `log.info`;ACL + 三要素已配
