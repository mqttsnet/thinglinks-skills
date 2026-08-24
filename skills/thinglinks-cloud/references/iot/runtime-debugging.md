# IoT 运行时调试

## 设备连接与 ACL

连接认证和 ACL 预加载是两件事:
- `authClient` 决定设备是否合法;先看 `certificationResult`。
- ACL 规则真正生效在 `clientAclValidation` 的 publish/subscribe 校验。
- 连接阶段 ACL 拉取失败可降级为空列表,不应否决已认证成功的设备。
- ACL 缓存读列表时用 typed-list helper;不要靠 `instanceof List` 直接信任 Redis 反序列化结果。

排查顺序:
1. `clientId` 是否形如 `{deviceSnowflake}@{tenantId}`,`ContextUtil` 是否设置租户。
2. 设备缓存/DB 是否能查到,`username/password/authMode/status` 是否通过。
3. ACL 规则是否存在,topic pattern 是否带前导 `/`。
4. Redis ACL list 反序列化异常时,回源 DB 并记录 key/field。

## 命令调试闭环

命令下发与响应要按同一设备和 topic 对齐:
- 下发 topic:`/{version}/devices/{deviceId}/command`,payload `msgType=cloudReq`。
- 响应 topic:`/{version}/devices/{deviceId}/commandResponse`,payload `msgType=deviceRsp`,复用同一 `mid`。
- `device_command` 只记录下发(0)和响应(1);调试台历史可按设备/topic 过滤。
- 原始 MQTT 调试报文记录 `{topic,payload}`,结构化命令记录实际 cloudReq 与 topic,不要为展示字段随意加列。

## 路由和运行时定位

- 先核对前端实际调用、controller mapping、内部客户端接口 path 三者,再改路径。
- `/inner/**` 只能服务间直连;经网关直测应失败。需要直测内部接口时用服务端口或专门测试入口。
- TDengine 时间戳是 19 位纳秒;前端毫秒时间要转换。
- 上行脚本调试只验证转换结果;运行时是否命中还要看渠道、设备绑定版本、topic pattern。
