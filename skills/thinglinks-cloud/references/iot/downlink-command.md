# 下行命令 + OTA

下行分两层:**① 业务层**构造平台标准报文(`thinglinks-link` 的 `DeviceCommandServiceImpl`、OTA 的 `OtaTaskExecutionHandler`、mqs 上行应答的 10 个 handler);**② 传输层** `DeviceDownlinkFacade` 按协议(MQTT/WS/TCP)把报文投到 broker。业务层只管"发什么",传输层只管"怎么送"。

## 下发链路总览

```
① 业务层(link 命令 / OTA / mqs 上行应答 handler)
   buildCommandMessage / cloudReq 业务体  →  JSON.toJSONString 一次  →  JSON 串
   → protocolMessageAdapter.buildResponse(json, encryptionDetails)   // 明文还原成对象塞 dataBody;密文加密
   → 拼下行 topic(见下)→ messageContent
   → DownlinkCommand.builder(){protocolType, tenantId, clientId, topic, qos, payload=messageContent, ...}
② 传输层
   → DeviceDownlinkFacade.dispatch(DownlinkCommand)
        ├ boot 部署:进程内直调 → DeviceDownlinkDispatchService
        └ cloud 部署:DeviceDownlinkApi(客户端接口 → thinglinks-broker-server)
                       → POST /inner/deviceDownlinkOpen/dispatch → DeviceDownlinkController → DeviceDownlinkDispatchService
   → DeviceDownlinkDispatchService 按 protocolType 选 sender(空/未知 → 兜底 MQTT)
        ├ MQTT      → MqttDownlinkSender      → MqttBrokerService.publishMessage      → BifroMQ /pub
        ├ WEBSOCKET → WebSocketDownlinkSender → WebSocketBrokerService.publishMessage → RocketMQ 广播 → 持有节点 socket(见 ws-downlink-broadcast.md)
        └ TCP       → TcpDownlinkSender(占位,暂 R.fail)
   → 记录指令
```

## DeviceDownlinkFacade(协议无关下行入口)

**Facade 在 `buildCommandMessage` / `buildResponse` 之上**,只做"协议感知的投递",不碰报文构造 —— 业务层把构造好的报文塞进 `DownlinkCommand.payload` 再交给它。

| 类 | 模块 / 包 | 职责 |
| --- | --- | --- |
| `DeviceDownlinkFacade`(接口) | broker-api `com.mqttsnet.thinglinks.broker` | 唯一方法 `R<?> dispatch(DownlinkCommand)` |
| `DeviceDownlinkFacadeImpl`(boot) | broker-boot-impl | 单体部署:直调 `DeviceDownlinkDispatchService` |
| `DeviceDownlinkFacadeImpl`(cloud) | broker-cloud-impl | 微服务部署:走 `DeviceDownlinkApi`(两个同名实现,按部署只上一个) |
| `DeviceDownlinkApi`(客户端接口) | broker-cloud-impl `broker.api` | 路径 `/inner/deviceDownlinkOpen`、`POST /dispatch`、带 fallback;目标服务 `thinglinks-broker-server`。**旗舰版是 `@HttpExchange` + `@PostExchange`,服务名与 fallback 在 `BrokerServerHttpServiceConfiguration` 里绑;社区版是 `@FeignClient(name=…, path=…, fallback=…)`** —— 见 `../system/service-rpc.md` |
| `DeviceDownlinkController` | broker-controller | 收内部调用 → `DeviceDownlinkDispatchService.dispatch` |
| `DeviceDownlinkDispatchService` | broker-biz `broker.downlink` | **真派发器**:启动期建 `Map<protocol→DownlinkChannelSender>`,按 `protocolType`(大写)选;空/未知 **兜底 MQTT**;sender 异常收进 `R.fail` |
| `DownlinkChannelSender`(接口 SPI) | broker-biz `broker.downlink` | `supportedProtocol()` + `send(DownlinkCommand)`;实现 `MqttDownlinkSender` / `WebSocketDownlinkSender` / `TcpDownlinkSender` |
| `DownlinkCommand`(DTO) | broker-entity `vo.query` | 协议无关载体:`protocolType/tenantId/clientId/deviceIdentification/topic/qos/payload/forceBase64Decode/clientType/expirySeconds/reqId` |

- **协议常量** `DownlinkProtocols`:`MQTT` / `WEBSOCKET` / `TCP`,对齐 `ProtocolTypeEnum.getValue()`;协议由 `resolveProtocolType(productId, boundVersionNo)` 推出再塞进 `DownlinkCommand`。
- **调用点**:link `DeviceCommandServiceImpl.buildAndSendMessage`(注入 `DeviceDownlinkFacade`);mqs `AbstractMessageHandler.sendMessage`(被 **10 个**上行应答 handler 复用:TimeSyncRequest / OtaPull / OtaReport / SecretKey / Add·Update·DeleteSubDevice / QueryDevice / ChatgptRequest / **ModelQuery**)。
- **访问边界**:`/inner/deviceDownlinkOpen` 是服务间接口,经网关访问应被拒绝;控制台下发走 `/link/deviceCommand/issueCommands`。
- **重构前 vs 后**:协议分支原本内联在调用方(link 旧私有 `sendMessage`/`sendWebSocketMessage` 的 if/else),现已收敛进 `DeviceDownlinkDispatchService`。**不存在**"旧 broker-api `@Component` 派发器"——c74a4f48 删的那批 `@Component` 是 WS 集群类(`SessionOwnerRegistry` 等,见 `ws-downlink-broadcast.md`),与下行命令无关。
- WS 协议的投递细节(广播扇出 + 持有节点投递)见 **`ws-downlink-broadcast.md`**。

## 下行 topic 规则

| 用途 | 模板 | 出处 |
| --- | --- | --- |
| 命令下发 | `/{sdkVersion}/devices/{deviceId}/command` | `DeviceCommandServiceImpl.generateResponseTopic` |
| OTA 命令 | `/{version}/devices/{deviceId}/topo/otaCommand` | `OtaTaskExecutionHandler.generateResponseTopic`(行 155-157) |

> `sdkVersion` 如 `v1` → `/v1/devices/xxx/command`。子设备命令发到**父网关**的 topic 上,见下节。
>
> **OTA ≠ 仅下行**:OTA 还有上行侧动作 —— 升级成功 / 设备版本上报会触发 `OtaModelVersionSwitcher` 把设备绑定产品版本迁到升级包配置的目标(影子)版本(幂等 + fail-soft,不打断 OTA 主流程),详见 `iot/ota.md`。

## 子设备命令:业务目标与接收方分开

`DeviceCommandServiceImpl.buildAndSendMessage` 里一条命令有两个角色:

| 角色 | 取谁 | 决定什么 |
| --- | --- | --- |
| 业务目标 `businessTarget` | 被下发的设备本身 | 业务体里的 `deviceIdentification` |
| 接收方 `recipient` | 普通设备 / 网关是自己;**子设备是父网关** | 信封加密参数、下行 topic(网关自己的 `deviceSdkVersion` 与标识)、`protocolType`(按网关的产品与绑定版本解析)、`DownlinkCommand` 的 `clientId` / `deviceIdentification` |

子设备逐项校验,任一不满足抛 `BizException`、**命令不发**:`gatewayId` 非空且不是自身 → 网关缓存存在 → 网关 `nodeType` 为网关且标识等于 `gatewayId` → 与子设备同租户。

- 信封构造抛异常或返回 null 同样中止,不会退化成发 `{}`。日志只记目标 / 接收方标识、`cipherFlag` 和异常类型,**不记**加密参数、载荷和异常文本(可能带密钥材料)。

## ⚠️ 单次序列化(避免多层转义)

`buildCommandMessage`(`DeviceCommandServiceImpl`)/ OTA(`OtaTaskExecutionHandler`)内部**已 `JSON.toJSONString` 一次**,返回 JSON 串。**不能再** `.map(JSON::toJSONString)`:

```java
// 对(命令):buildCommandMessage 内部已序列化一次
String commandMessageJson = buildCommandMessage(businessTarget, commandRequest);
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

`EncryptionDetailsDTO{ cipherFlag, signKey, encryptKey, encryptVector, mId }`(取自接收方的 DeviceCacheVO,子设备命令即父网关,见上文)。`buildResponse → ProtocolMessageSignatureVerifierUtils.encryptMessage`(util-pro/protocol-starter):
- `cipherFlag=0` 明文:dataBody = 还原的 JSON 对象,不加密,`dataSign=""`;
- `cipherFlag=1`(SM4)/`2`(AES256):dataBody = 密文(encryptKey/encryptVector),`dataSign` = sign(timeStamp:signKey)。

加密方式枚举:`DeviceEncryptMethodEnum`(0/1/2)。
