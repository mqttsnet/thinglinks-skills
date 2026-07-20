# Runtime Configuration and Deployment

## Effective Configuration

Each plugin's `ConfigUtil` loads two sources:

1. `classpath:/config.yaml` from the context module provides built-in defaults.
2. `./conf/standalone.yml` is parsed as an optional runtime override.

The override copies non-null top-level properties; it is not a recursive deep
merge. Auth and event sections should therefore be supplied as complete sections
when overridden. Unknown YAML properties are ignored.

`getOverwriteConfig()` currently catches every read/parse error and silently
falls back to built-in defaults. For the auth plugin this may leave
`acl.enabled=false`; deployment verification must confirm the effective ACL state.
The `conf/config.yaml` carried in each ZIP is an allowed deployment artifact, but
the current loader does not use it as the external override path.

## Registration

After extracting all four ZIPs into BifroMQ's plugin directory, configure these
providers in `conf/standalone.yml`:

```yaml
authProviderFQN: com.mqttsnet.thinglinks.BifromqAuthProviderPluginAuthProvider
settingProviderFQN: com.mqttsnet.thinglinks.BifromqSettingProviderPluginSettingProvider
resourceThrottlerFQN: com.mqttsnet.thinglinks.BifromqResourceThrottlerPluginResourceThrottlerProvider
```

Register the event collector using the BifroMQ 3.3.5 event-collector setting and
the implementation shipped by the event plugin. Keep the required JVM flag:

```text
-Dsetting_provide_init_value=true
```

## Deployment Checks

- Authentication endpoint and ACL endpoint resolve from the complete auth
  section expected by `PluginConfig`.
- ACL is enabled or disabled intentionally; allowlisted tenants are reviewed.
- Kafka bootstrap and optional SASL fields are present without logging the JAAS
  string.
- All four provider FQNs load, and no 4.x `org.apache.bifromq.*` class is mixed
  into the 3.3.5 runtime.
- Connect, publish, subscribe, heartbeat, Kafka event, setting, and shutdown
  smoke tests pass after restart.
