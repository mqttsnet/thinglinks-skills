# 下行命令 + OTA

`thinglinks-link` 的 `DeviceCommandServiceImpl`、`OtaTaskExecutionHandler`(`...device.service.impl` / `...ota.service.statemachine.event.handler`)。

## 下发链路

```
下发(设备调试/业务/OTA)
 → buildCommandMessage / OTA 构造 cloudReq 业务体  →  JSON.toJSONString 一次  →  JSON 串
 → protocolMessageAdapter.buildResponse(commandMessageJson, encryptionDetails)  // 明文还原成对象塞 dataBody;密文加密
 → 拼下行 topic → 下发 broker;记录指令
```

## 下行 topic 规则

| 用途 | 模板 | 出处 |
| --- | --- | --- |
| 命令下发 | `/{sdkVersion}/devices/{deviceId}/command` | `DeviceCommandServiceImpl.generateResponseTopic`(行 360-381) |
| OTA 命令 | `/{version}/devices/{deviceId}/topo/otaCommand` | `OtaTaskExecutionHandler.generateResponseTopic`(行 155-157) |

> 子设备用 `gatewayId` 代替 `deviceIdentification`。`sdkVersion` 如 `v1` → `/v1/devices/xxx/command`。

## ⚠️ 单次序列化(避免多层转义)

`buildCommandMessage`(`DeviceCommandServiceImpl` 行 391-394)/ OTA(行 115-116)内部**已 `JSON.toJSONString` 一次**,返回 JSON 串。**不能再** `.map(JSON::toJSONString)`:

```java
// 对(命令):buildCommandMessage 内部已序列化一次
String commandMessageJson = Optional.ofNullable(commandRequest)
    .map(cr -> buildCommandMessage(deviceCacheVO, cr)).orElse("{}");
// 对(OTA):同样只一次
String commandMessageJson = JSON.toJSONString(commandRequest);
ProtocolDataMessageDTO msg = protocolMessageAdapter.buildResponse(commandMessageJson, encryptionDetails);
```
`buildResponse` 明文时 `isTypeJSON ? readValue : ...` 把**单次**序列化的串还原成对象塞 dataBody;传双重的留一层转义 → 指令记录 dataBody 多层 `\\\"`。

## cloudReq 业务体(明文)

```json
{"cmd":"setBrightness","deviceIdentification":"...","msgType":"cloudReq",
 "params":{"brightness":1},"productIdentification":"...","serviceCode":"default_attributes_controls"}
```
明文(cipherFlag=0)→ 信封 dataBody 是该 JSON **对象**(非转义串)。

## 加密下发(cipherFlag ≠ 0)

`EncryptionDetailsDTO{ cipherFlag, signKey, encryptKey, encryptVector, mId }`(取自 DeviceCacheVO)。`buildResponse → ProtocolMessageSignatureVerifierUtils.encryptMessage`(util-pro/protocol-starter):
- `cipherFlag=0` 明文:dataBody = 还原的 JSON 对象,不加密,`dataSign=""`;
- `cipherFlag=1`(SM4)/`2`(AES256):dataBody = 密文(encryptKey/encryptVector),`dataSign` = sign(timeStamp:signKey)。

加密方式枚举:`DeviceEncryptMethodEnum`(0/1/2)。
