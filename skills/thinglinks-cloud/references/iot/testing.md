# IoT 测试 playbook(下发 / 脚本调试 / 校验)

平台自带可测的真实端点。网关前缀(`StripPrefix=1`):`/link/**`→link · `/mqs/**`→mqs · `/broker/**`→broker · `/tds/**`→tds。响应统一 `R<T>`(`{code,msg,data,isSuccess}`)。**设备接入 + 上行模拟**见 `device-access.md`;本篇是**下发 / 调试 / 校验**。

## 一、下发 / 发报文

| 用途 | 端点 | 请求关键字段 | 说明 |
| --- | --- | --- | --- |
| **物模型命令下发**(控制台) | `POST /link/deviceCommand/issueCommands` | `{serial[],parallel[]}` 内 `CommandIssueRequestParam`:`deviceIdentification`(`ALL`=产品下全部激活)、`productIdentification`、`msgType=cloudReq`、`serviceCode`、`cmd`、`params{}` | 构信封(SM4/AES+签名,取设备缓存)→ `DeviceDownlinkFacade.dispatch` → 落 `DeviceCommand` 记录。设备须在缓存,否则 "Device does not exist!" |
| **MQTT 自定义发报文**(MQTT 调试页 `sendMsg`) | `POST /link/deviceCommand/sendMqttCustomMessage` | `topic`、`qos`、`payload`(文本/JSON/Base64 二进制)、`tenantId`、`expirySeconds` | 直走 MQTT broker facade(**不**经协议路由);payload 自动判 Base64 |
| **协议无关下行**(内部/直测) | `POST /broker/anyUser/deviceDownlinkOpen/dispatch` | `DownlinkCommand`:`protocolType`(MQTT/WEBSOCKET/TCP,空→兜底 MQTT)、`tenantId`、`clientId`(WS 必填)、`topic`、`qos`、`payload`、`expirySeconds`… | 按协议选 sender;`issueCommands` 内部走的就是它 |
| **broker 裸 MQTT 发布** | `POST /broker/anyUser/mqttBrokerOpen/sendMessage` | `PublishMessageRequestVO`:`tenantId`、`topic`、`qos`、`payload`、`forceBase64Decode` | 最底层,直发 BifroMQ |

## 二、规则脚本调试(上线前 dry-run)

`POST /mqs/transform/debug`(规则脚本调试面板 `transformDebug`):
- 请求 `TransformDebugParam`:`scriptContent`(Groovy)、`deviceIdentification`、`originTopic`、`originBody`(支持 `0x…` 十六进制)、`extendParams`(→ `config` 绑定)、`objectVersion`(产品版本→物模型)、`scriptUniqueKey`。
- **`scriptUniqueKey` = 命中三要素**:`scriptType:channelCode(渠道):productIdentification(+版本):topicPattern`(对应"渠道 + 版本 + 主题模式")。
- 响应 `TransformDebugResultVO`:`result`(执行状态/context/异常 = 转换后的标准 datas + 日志)、`binding`(注入变量快照)、`deviceResolved`/`productResolved`。

> 不连真实设备即可验证"厂商报文 → 标准 datas"的转换是否正确。

## 三、校验落库

| 校验 | 端点 | 关键参数 | 看什么 |
| --- | --- | --- | --- |
| **设备影子**(最新值) | `GET /link/deviceShadow/queryDeviceShadow` | `deviceIdentification`、`serviceCode`、`startTime`/`endTime`(19 位**纳秒**,成对,≤60min)、`versionNo`(历史版本快照) | 上行/命令是否落进影子(services→properties 最新 reported) |
| 影子(北向变体) | `GET /link/anyUser/deviceOpen/queryDeviceShadowByNorthbound` | 同上 | 开放接口变体 |
| **时序历史**(TDengine) | `GET /tds/tds/getDataInRangeOrLastRecord` | `tableName`(设备/版本对应子表)、`startTime`/`endTime`(纳秒);无范围→取最后一条 | 历史数据点;表结构查 `GET /tds/tds/describeSuperOrSubTable?tableName=` |
| **指令记录** | `POST /link/deviceCommand/page` | `{current,size,model:{deviceIdentification, commandType(0=下发/1=响应), status}}` | 命令是否下发 + 状态(SUCCESS/FAILURE) |

## 四、端到端测试流

1. **模拟上行**:连设备 + 发 datas(见 `device-access.md`)—— 或先 `POST /mqs/transform/debug` 干跑转换。
2. **下发命令**:`issueCommands`(物模型命令)/ `sendMqttCustomMessage`(裸报文)/ `dispatch`(直测)。
3. **校验**:影子 `queryDeviceShadow` · 历史 `getDataInRangeOrLastRecord` · 指令 `deviceCommand/page`。

> 前端也直接提供这套测试工具:WS/MQTT 调试页(`运维管理 > 调试中心`)+ 规则脚本调试面板,底层就是上面的端点(见 `thinglinks-web` skill)。

## ⚠️ 测试注意

- `*` 必填走 bean 校验;**TDengine 时间戳是 19 位纳秒**,不是毫秒。
- `issueCommands` 构的是**加密信封**(SM4/AES+SHA256,取设备缓存密钥),设备须存在于 `LinkCacheDataHelper` 缓存,否则报 "Device does not exist!"。
- `sendMqttCustomMessage`(直发 broker,不路由) vs `dispatch`(协议路由,`issueCommands` 内部用)—— 别混。
- 端点为 controller 相对路径,经网关加模块前缀;类名/行号随版本演进,核对真实代码 `com.mqttsnet.thinglinks.*`。
