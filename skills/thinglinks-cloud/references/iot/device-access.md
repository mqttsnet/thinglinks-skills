# 设备接入 + 上行(连接 / 鉴权 / ACL / 上行帧 / 凭证)

设备怎么连上平台、怎么上报。**下发 / 校验**见 `testing.md`。鉴权/ACL 是 broker→cloud 的 HTTP 面(`/anyTenant/deviceOpen/**`,经网关加 `/link` 前缀,无 token,租户从 clientId 取)。

## 凭证派生(设备新增时)

| 凭证 | 来源 |
| --- | --- |
| `clientId` | **`{雪花}@{tenantId}`**(`SnowflakeIdUtil.nextId()` + `@` + 租户) |
| `deviceIdentification` | 另一个雪花(topic/payload 里的 `deviceId`) |
| `username` / `password` | **新增时调用方自填**(`DeviceSaveVO`),原样存库;鉴权时明文 equals,**不是自动生成的 token** |
| `authMode` | 0=账号密码 / 1=SSL |
| `signKey`/`encryptKey`/`encryptVector`/`encryptMethod` | 信封加解密用;模拟测试设 `encryptMethod=0`(明文)免 SM4/AES |

## 连接鉴权

`POST /link/anyTenant/deviceOpen/clientConnectionAuthentication`(BifroMQ 连接时调)
- 请求 `DeviceAuthenticationQuery`:`clientIdentifier`(`{雪花}@{租户}`)、`username`、`password`、`protocolType`(MQTT/WEBSOCKET)、`authMode`、SSL 时 `clientCertificate`。
- **通过条件**:① 按 clientId 查到设备(`linkCacheDataHelper.getDeviceCacheVO`,否则"设备不存在")② `authMode` 与设备一致 ③ 状态不在断连集合 ④ **`username==设备.userName` 且 `password==设备.password`**(明文 equals)⑤ SSL 再验 CA。
- 响应 `DeviceAuthenticationResultVO`:`certificationResult`(BifroMQ 看这个)、`errorMessage`、`deviceInfoResult`(productIdentification/signKey/encryptKey…)、`aclRuleListResult`、`tenantId`。
- 连接认证与 ACL 预加载解耦:`authClient` 通过即设备合法;ACL 拉取失败可降级为空列表,真正 publish/subscribe 权限在 `clientAclValidation` 判定。

## 发布 / 订阅 ACL

`POST /link/anyTenant/deviceOpen/clientAclValidation`(每次 pub/sub 调)
- 请求 `DeviceAclCheckQuery`:`tenantId`(必填)、`clientIdentifier`、`topic`、`actionType`(**1=PUBLISH / 2=SUBSCRIBE / 3=UNSUB**)。
- 响应 `DeviceAclCheckResultVO`:`allowed` + `errorMessage`("Device Not Found" / "Not ACL Rule"…)。
- **判定**:`DeviceAclRule` 按 `priority` 升序,**首个 `topicPattern` 命中 → 用其 decision**(放行/拒绝);**无匹配 → 默认拒**,**无规则 → 拒**。规则分产品级(`ruleLevel=0`)/设备级(`1`),占位 `{productId}/{deviceId}` 按设备替换。
- ⚠️ topic 是**斜杠开头**(`/v1/devices/{id}/datas`),要发数据 ACL 必须放行**带前导 `/` 的模式**(如 `/#` 或 `/+/devices/+/#`);**不自动建默认规则,没建就全拒**。

## MQTT 上行 topic → handler

`DevicePublishProcessor` → `TopicHandlerFactory` 按 `topicPattern()` 正则首个命中(无则 `DefaultHandler`)。`/([^/]+)/devices/([^/]+)`,group2 = deviceId。

| topic | handler |
| --- | --- |
| `/{v}/devices/{id}/datas` | **DeviceDatasHandler**(属性/数据上报 → TDengine + 影子) |
| `/{v}/devices/{id}/commandResponse` | CommandResponseHandler |
| `/{v}/devices/{id}/topo/{add,update,delete,query}` | 子设备增删改查 Handler |
| `/{v}/devices/{id}/topo/{secretKey,timeSyncRequest}` | SecretKey / TimeSync |
| `/{v}/devices/{id}/topo/ota{Pull,Report,ReadResponse,CommandResponse}` | OTA 各 Handler |
| `/{v}/devices/{id}/model/query` | **ModelQueryHandler**(设备按产品标识 + 版本序号拉取物模型完整定义,应答发到 `/model/queryResponse`) |
| `/{v}/devices/{id}/chatgpt/request` | ChatgptRequestHandler |
| 不匹配 | DefaultHandler(可配 `topicPattern=#` 的规则脚本兜底) |

> `model/query` 挂在 `model/` 而不是 `topo/` 下是有理由的:`topo/` 那一族是拓扑、密钥、时间同步、OTA
> (functionType 1/2/4/5),而 functionType 3「物模型通信」(`datas` / `command` / `commandResponse`)
> 全都不在 `topo/` 下,`model/query` 与它们同族。**与 `topo/query` 的分工**:后者返回设备档案,
> 前者只返回产品物模型,不含任何设备信息。

**`/datas` 报文 = 信封**(`ProtocolDataMessageDTO`):
```json
{ "head": { "cipherFlag": 0, "mid": 123, "timeStamp": 1700000000000 },
  "dataBody": { "devices": [ { "deviceId": "{id}",
    "services": [ { "serviceCode": "Temperature", "data": { }, "eventTime": 1700000000000 } ] } ] },
  "dataSign": "<SHA256 签名>" }
```
`cipherFlag` 0 明文 / 1 SM4 / 2 AES;签名/密钥取自设备缓存。明文测试用 `cipherFlag=0` + 有效 `dataSign`。

## WS 接入 + 上行帧

端点 `ws://host/anyUser/deviceOpenSocket/accessProtocol/socket/{tenantId}/{clientId}?username=U&password=P`(`@OnOpen` 调同一 `clientConnectionAuthentication`,`authMode=0`、`protocolType=WEBSOCKET`,租户取**路径段**)。
- **上行**:`{"topic":"/v1/devices/{deviceId}/datas","payload":"<信封 JSON 字符串>"}`;心跳 `{"type":"PING"}`。非 `{topic,payload}` 的裸文本/hex → 整体当 `payload`、`topic` 兜底为 `#`(可被 `topicPattern=#` 脚本转换)。→ 转 Kafka,与 MQTT 上行**汇到同一 TopicHandler 路由**。
- **下行**:`WsProtocolMessage` `{"type":"DOWN","topic":…,"payload":…,"messageId":…,"ts":…}`(另有 KICK/RECONNECT/PONG)。

## 模拟设备(测试)

- **MQTT**:clientId = `{设备雪花}@{租户}`、user/pass = 建设备时设的值 → BifroMQ 调 `clientConnectionAuthentication` 须返 `certificationResult:true` → 建一条放行前导 `/` 的 `DeviceAclRule`(否则 pub 全拒)→ publish 到 `/v1/devices/{deviceIdentification}/datas`,体为信封(`cipherFlag=0` + 有效 `dataSign`)。
- **WS**:连上面的 ws URL → 发 `{"topic":"/v1/devices/{deviceId}/datas","payload":"<信封字符串>"}`;心跳 `{"type":"PING"}`。

## ⚠️ 反幻觉

- 凭证就是设备行的 `userName`/`password`(明文 equals),**不是 token**;模拟前先建好设备记下这俩值。
- ACL **无规则 = 拒**,topic 带前导 `/`,放行模式也要带 `/`。
- WS 上行的**内层 `topic` 决定路由**(和 MQTT 一样);心跳是 `{"type":"PING"}`。
- 端点为 controller 相对路径,经网关加前缀;类名/行号随版本演进,核对真实代码。
