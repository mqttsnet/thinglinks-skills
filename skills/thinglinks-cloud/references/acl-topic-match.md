# ACL 发布鉴权 + 主题匹配

两层独立、用**不同的 matcher**:
- **ACL**(决定能不能发该 topic)→ `AclMatcherUtil`(link-biz);
- **转换/handler 主题模式**(决定要不要转换/路由)→ `MqttTopicMatcher`(util-core)。
两者都要能匹配你的发布主题。

## ACL 发布鉴权

入口 `DeviceAclRuleServiceImpl.checkAclPermission(DeviceAclCheckQuery)`(`thinglinks-link-biz/.../device/service/impl`,行 212):查缓存 → 过滤规则 → 占位符替换 → matcher 决策 → allow/deny。
- 规则缓存:`LinkCacheDataHelper.getDeviceAclRules(productId, deviceId)`(Redis Hash);`DeviceAclRuleCacheVO{topicPattern, actionType, decision, enabled, priority}`。
- 匹配:`AclMatcherUtil.isTopicAllowed(topic, rules)`(`link-biz/.../utils/acl`,行 76):**priority 升序**、`action` 匹配(目标动作或 ALL)、`+`/`#` 通配(`#` 须末尾)、`$` 系统 topic 精确处理;`compilePattern` 编译结果用 Caffeine 缓存(10w 条、10min access / 30min write)。
- 占位符:`${clientId}` / `${productId}` / `${deviceId}` 等运行时替换后再匹配。
- 拒绝:`denied("Not ACL Rule")` / `denied("Device Not Found")`。

**生效点**:下行/上行发布走 `MqttBrokerServiceImpl.publishMessage`(`broker-biz`,行 51)→ `callPublishBifromqApi` → BifroMQ `/pub`(内含 ACL 校验);非 2xx/异常 → `BizException` → broker 报错/断连(`Server-initiated disconnect … ACL deny`)。

**最常见坑**:平台默认数据上报 ACL 多是 `topicPattern = /#`(**前导 `/`**)。设备发到无前导 `/` 的 `aw/f135/up` → 不匹配 → 断连。**解决**:发布主题带前导 `/`(`/aw/f135/1/up`),或把规则改成 `#` / `aw/#`。配置入口:运维管理 → 访问控制 → ACL规则(产品级/设备级,动作 发布/订阅)。

## 转换/handler 主题模式(MqttTopicMatcher)

`com.mqttsnet.basic.utils.topic.MqttTopicMatcher.match(pattern, topic)`(util-core):equals 短路;`#` 匹配一切;`/#` 只匹配带前导 `/`;`+` 单层、`#` 多层(末尾)。`matchAny(patterns, topic)` 批量。配合 `TopicPlaceholders.replaceWithWildcard`(`${app_id}` 等 → `+`)。

| 写法 | 含义 |
| --- | --- |
| `/aw/f135/up` | 精确 |
| `/aw/f135/+/up` | `+` 单层 |
| `/aw/f135/#` | `#` 多层(末尾) |
| `#` | 匹配一切(裸报文/无 topic 兜底;慎用) |

> 厂商裸报文(无 topic)→ 平台兜底为 `#`,主题模式要设 `#` 才命中。util 侧细节见 `thinglinks-util` skill。
