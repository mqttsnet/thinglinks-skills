# RocketMQ starter

包 `com.mqttsnet.basic.rocketmq`。只有主类标注 `@EnableRocketmqStarter` 且配置 `rocketmq.name-server` 时装配。

## 发送

优先使用框架 `RocketmqTemplate`：sync/async/one-way/orderly 方法都会把 `ContextUtil.getLocalMap()` 序列化到 `MessageHeaders.LOCAL_MAP`。

- 序列化失败降级为 `{}`，不阻断发送。
- header 超过 8KB 只告警，不截断；不要把大对象放入 LocalMap。
- orderly 发送使用稳定业务标识作为 `hashKey`，保证同一标识进入同一队列。
- one-way 无 ack，只用于允许丢失的日志或统计。
- `getRaw()` 是高级能力逃生口，不自动注入 LocalMap；需要上下文时先调用 `buildContextHeaderMessage()` 或显式设置 header。

## 消费

租户感知消费者继承 `AbstractTenantAwareRocketmqListener<T>`：

1. `onMessage` 从 header 恢复 LocalMap。
2. `parseBody` 默认按 `getBodyClass()` 做 JSON 反序列化，可覆盖为其他编码。
3. `onTenantMessage` 执行业务逻辑，此时租户、链路和动态数据源上下文已就绪。
4. `finally` 清理 `ContextUtil` 与 MDC；业务异常重新抛出，让 RocketMQ 触发重试。

header 缺失或损坏时会使用空上下文继续消费。依赖租户身份的消费者必须在业务入口显式校验必需字段，不能把“恢复为空”当成合法租户。
