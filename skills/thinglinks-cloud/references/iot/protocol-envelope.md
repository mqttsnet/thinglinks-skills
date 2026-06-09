# ThingLinks 协议信封

平台标准报文结构。编解码/签名在 `thinglinks-util-pro/thinglinks-protocol-starter`(`com.mqttsnet.basic.protocol`):`ProtocolMessageAdapter`、`ProtocolMessageSignatureVerifierUtils`。

## 结构

```json
{
  "head":    { "mid": 123, "cipherFlag": 0, "timeStamp": 1780000000000 },
  "dataBody":{ "devices": [ { "deviceId": "<设备ID>", "services": [
    { "serviceCode": "<服务码>", "data": { "属性码": "值" }, "eventTime": 1780000000000 }
  ] } ] },
  "dataSign": ""
}
```

| 字段 | 类型 | 取值 |
| --- | --- | --- |
| head.mid | Long | 消息 ID,数值,`SnowflakeIdUtil.nextLong()` |
| head.cipherFlag | Integer | `0` 明文 / `1` SM4 / `2` AES。转换产出明文 → `0` |
| head.timeStamp | Long | 13 位毫秒,`System.currentTimeMillis()` |
| dataBody.devices[].deviceId | String | 平台设备标识 deviceIdentification |
| services[].serviceCode | String | **= 物模型服务码** |
| services[].data | Object | 属性键值,**键 = 物模型 propertyCode** |
| services[].eventTime | Long | 采集时间(毫秒) |
| dataSign | String | 明文留空;加密见下 |

`services` 是数组(一条报文可多服务)。`TopoDeviceDataReportParam`(`com.mqttsnet.thinglinks.protocol.vo.param`)= 该结构的 Java 映射:`devices: List<DeviceS>`,`DeviceS{deviceId, services: List<Services>}`,`Services{serviceCode, data:Object, eventTime:Long}`。

## cipherFlag 与解密

下游 `ProtocolMessageAdapter.decryptMessage(body, EncryptionDetailsDTO)` 按 `head.cipherFlag` 决定是否解密:
- `0` 明文:dataBody 原样(是 JSON 对象,不是转义串);
- `1/2`:按 signKey/encryptKey/encryptVector 解密。

**cipherFlag 必须与 dataBody 实际加密状态一致**;转换脚本产出明文就填 `0`,否则下游按密文解密会失败。

## dataSign 加签(仅 cipherFlag ≠ 0)

```groovy
import org.apache.commons.codec.digest.DigestUtils
def dataSign = DigestUtils.sha256Hex(timeStamp + ":" + signKey).toLowerCase()
```
明文 `dataSign = ""`。

## 序列化坑(关键)

1. **Long → String**:`com.mqttsnet.basic.jackson.LampJacksonModule` 全局注册 `addSerializer(Long.class, ToStringSerializer)`,rule 的 JSON 响应会把所有 Long 序列化成 String。规则脚本因此**必须 `JSON.toJSONString(payload)`** 让信封变成对外不透明的字符串,数值才保真。
2. **双重序列化(下行)**:dataBody 出现多层 `\\\"` = 对**已序列化的 JSON 串又 `toJSONString` 一次**。`buildResponse` 明文时会 `isTypeJSON ? readValue : ...` 把单次序列化的 JSON 串还原成对象;传双重的就会留一层转义。**只序列化一次**。见 `references/downlink-command.md`。

## buildResponse(下行用)

`ProtocolMessageAdapter.buildResponse(String resultDataBody, EncryptionDetailsDTO)` → 内部 `encryptMessage(resultDataBody, mid, cipherFlag, ...)` →(明文 `readValue` 还原对象)→ `JSON.parseObject(dataBody, ProtocolDataMessageDTO)`。**入参是单次序列化的 dataBody JSON 串。**
