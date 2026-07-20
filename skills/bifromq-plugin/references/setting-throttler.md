# Setting and Resource Providers

Both providers run on broker-controlled synchronous paths. Their callbacks must
return from in-memory state and must not call databases, HTTP services, or remote
caches.

## Setting Provider

Start BifroMQ with:

```text
-Dsetting_provide_init_value=true
```

Without this flag, a setting cache miss uses BifroMQ's initial value instead of
calling the plugin. The custom `DebugModeEnabled` value then has no effect, and
`PING_REQ` events needed by the heartbeat pipeline are not collected.

The current provider handles:

| Setting | Source |
| --- | --- |
| `DebugModeEnabled` | `pluginConfig.debugModeEnabled`, fallback `true` |
| `MaxTopicFiltersPerSub` | `pluginConfig.maxTopicFiltersPerSub` |
| `MaxTopicFiltersPerInbox` | `pluginConfig.maxTopicFiltersPerInbox` |
| other settings | `setting.current(tenantId)` |

Despite accepting `tenantId`, the three configured values are currently global.
Do not describe them as tenant-specific until a real per-tenant lookup is added
without blocking the callback.

## Resource Throttler

`IResourceThrottler.hasResource(tenantId, type)` currently logs the call and
returns `true`. It does not enforce connection, message-rate, storage, or other
tenant limits.

Before claiming resource isolation:

1. define the resource policy and source of in-memory limits;
2. remove per-call `INFO` logging from the hot path;
3. return `false` for tested exhaustion cases;
4. verify the resulting `ResourceThrottling` event reaches the event collector;
5. test callback latency under load.
