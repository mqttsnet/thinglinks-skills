# 配置提供 + 资源限流

## ISettingProvider(setting-provider-plugin)

实现 `BifromqSettingProviderPluginSettingProvider`(行 70)。
- `provide(Setting setting, String tenantId)` → `String/Long/Boolean`,返回**租户级**运行时配置;
- ⚠️ **必须同步、只读内存**(BifroMQ 高频调用,**禁 DB / RPC / 阻塞**)。
- ⚠️ **铁律**:BifroMQ 启动参数加 **`-Dsetting_provide_init_value=true`**,否则 `provide` 的 cache miss 会用内核默认值 → **插件配置全部被覆盖失效**(连带 `PING_REQ` 心跳采集不到)。

## IResourceThrottler(resource-throttler-plugin)

实现 `BifromqResourceThrottlerPluginResourceThrottlerProvider`。多租户资源隔离 / 限流(连接数、消息速率等)。同步路径,逻辑保持轻量。

> 两者都在 BifroMQ event loop 的同步路径上 —— 实现里**不要**做任何阻塞/远程调用。
