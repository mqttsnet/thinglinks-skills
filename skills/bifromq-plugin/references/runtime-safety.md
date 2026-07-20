# Runtime and Logging Safety

## Sensitive Data

Never log:

- complete `config.yaml`, `standalone.yml`, or `PluginConfig` objects;
- MQTT password, client certificate, token, or complete auth response;
- complete `ClientInfo` metadata or ACL request payload;
- Kafka SASL JAAS configuration.

Log only the minimum identifiers needed for diagnosis. The current hardening gate
removes constructor/context configuration dumps, but it does not inspect every
provider class. Authentication certificate/metadata logs and per-event `INFO`
logs remain explicit review targets.

## Logback Context

The current four plugin entry classes configure `conf/logback.xml` in this order:

1. `configurator.setContext(context)`;
2. `context.reset()`;
3. `context.putProperty("pluginId", pluginId)`;
4. `configurator.doConfigure(logbackConfig)`.

`pluginId` must not be passed through `System.setProperty`, and every plugin
Logback file must use `<configuration scan="false">` without `scanPeriod`.

This is not isolated logging: `LoggerFactory.getILoggerFactory()` returns a shared
`LoggerContext`. Resetting it can replace broker or previously loaded plugin
configuration, and the last plugin can overwrite `pluginId`. A logging redesign
must test broker logs plus all four plugins loaded together; update the safety
test with the implementation instead of treating the current sequence as proof
of isolation.

## Hot Paths

- Keep ACL HTTP asynchronous; keep ACL metadata matching on its executor.
- Keep setting and throttling callbacks in memory and bounded in time.
- Avoid per-message/per-event `INFO` logs in `report`, processor, send callback,
  cache eviction, or `hasResource` paths. Use debug/trace or sampled metrics.
- Treat the event queue as unbounded until code adds a capacity and explicit
  rejection/backpressure policy.

Run `scripts/tests/logging-security-test.sh` after changing entry classes,
contexts, or Logback files. Also inspect provider logs because that script's
current scope is intentionally narrower.
