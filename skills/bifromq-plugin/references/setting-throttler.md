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
calling the plugin — every configured value below silently reverts to the kernel
default (`false` / 10 / 100 / 200). The custom `DebugModeEnabled` value then has no
effect, and `PING_REQ` events needed by the heartbeat pipeline are not collected.

The current provider handles:

| Setting | Source | Plugin default | BifroMQ default |
| --- | --- | --- | --- |
| `DebugModeEnabled` | `pluginConfig.debugModeEnabled`, fallback `true` | `true` | `false` |
| `MaxTopicFiltersPerSub` | `pluginConfig.maxTopicFiltersPerSub` | 100 | 10 |
| `MaxTopicFiltersPerInbox` | `pluginConfig.maxTopicFiltersPerInbox` | 500 | 100 |
| `MsgPubPerSec` | `pluginConfig.msgPubPerSec` | 1000 | 200 |
| other settings | `setting.current(tenantId)` | — | — |

`MsgPubPerSec` caps how many messages a single MQTT client may publish per second.
The plugin default of 1000 is the maximum BifroMQ 3.3.5 accepts — it is a ceiling,
not a headroom value, so do not propose raising it.

Despite accepting `tenantId`, all four configured values are currently global.
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
