# 认证 + ACL(auth-provider-plugin)

`IAuthProvider` 实现:`BifromqAuthProviderPluginAuthProvider`(`bifromq-auth-provider-plugin/auth-provider`)。

## 设备认证 auth()

`auth(MQTT3AuthData / MQTT5AuthData)`(行 96)→ 异步 HTTP POST 平台认证端点:
- 默认 `http://127.0.0.1:18760/link/anyTenant/deviceOpen/clientConnectionAuthentication`(`clientConnectionAuthenticationAsync` 行 225);
- 请求体:clientId / username / password / cert;
- 返回 `{ certificationResult, deviceInfo, aclRuleList }`;
- 成功 → `Ok.Builder`,把 **tenantId / userId / ACL 规则嵌入 `ClientInfo` 元数据**(后续 ACL 走快路径无需再请求)。

## 发布/订阅 ACL check()

`check(ClientInfo, MQTTAction)`(行 503)—— 覆盖 PUB / SUB / UNSUB:

1. **快路径**(行 560):从 `ClientInfo.metadataMap[ACL_RULE]` 取 ACL 规则(JSON),**priority 升序**,**首个 topic 命中的规则**决定 allow/deny。
   - 通配匹配用 util 的 `MqttTopicMatcher`(`+`/`#`/`/`);
   - 占位符 `{deviceId}` / `{productId}` / `{clientId}` 由 `AclTopicPatternPlaceholderReplacer` 替换后再匹配。
2. **慢路径/回退**(行 623 `checkAclViaHttpApiAsync`):元数据未命中或解析失败 → 异步 HTTP POST `…/link/anyTenant/deviceOpen/clientAclValidation`,HTTP 200 = 允许。
3. **缓存**(行 109):Caffeine `AsyncCache`,key = `clientId|actionType|topic`(topic 多斜杠归一化),默认 200w 容量 / 10min 过期 / 2min 后台刷新,内部防并发击穿。
4. **直接放行**:ACL 关闭(`acl.enabled=false`)或 tenantId 在白名单。

> ⚠️ 全程**不阻塞 BifroMQ event loop**:HTTP 异步、CPU 工作丢 executor。

## 模型 / 配置

- `DeviceInfo`、`DeviceAclRule`(`auth-plugin-context`)。
- `AuthProviderConfig`:`auth.baseUrl`(18760)、`auth.clientAuthEndpoint`、`acl.enabled`、`acl.aclCheckEndpoint`、`acl.tenantWhitelist`、`acl.cache{maxSize/expireMinutes/refreshAfterWrite}`。

> 平台侧 ACL 规则的产生/匹配(`AclMatcherUtil`、ACL 规则配置)见 `thinglinks-cloud` 的 `acl-topic-match.md`;这里是 **broker 侧的执行点**。
