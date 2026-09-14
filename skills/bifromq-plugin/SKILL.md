---
name: bifromq-plugin
description: >
  Use when modifying, reviewing, configuring, packaging, or troubleshooting the
  ThingLinks BifroMQ 3.3.5 plugins in bifromq-plugin-pro, including authentication
  and ACL, Kafka event routing, setting/resource providers, plugin logging and
  configuration loading, standalone.yml registration, compatibility versions,
  or release ZIP contents.
---

# ThingLinks BifroMQ Plugin

Four PF4J plugins target BifroMQ 3.3.5. Auth, event, and setting code uses
`com.baidu.bifromq.*`; do not copy 4.x `org.apache.bifromq.*` examples here. Source comments
that mention `org.apache.bifromq` are 4.0 upgrade notes, not current imports.

**The Java target differs by edition and is not a detail you can assume.** Read
`THINGLINKS_JAVA_VERSION` from `.thinglinks-product.env`: the Enterprise repo
(`bifromq-plugin-pro`) is on **JDK 25** with `maven.compiler.release=25` and a Maven
enforcer that fails the build on anything lower; the Community monorepo copy is on JDK 17.
Change it through `scripts/product-config.sh set-java-version <major>`, never by editing POMs.

## Components

| Module | SPI | Current responsibility |
| --- | --- | --- |
| `bifromq-auth-provider-plugin` | `IAuthProvider` | MQTT 3/5 authentication and PUB/SUB/UNSUB ACL |
| `bifromq-event-collector-plugin` | `IEventCollector` | broker events to Kafka for `thinglinks-mqs` |
| `bifromq-setting-provider-plugin` | `ISettingProvider` | in-memory broker settings |
| `bifromq-resource-throttler-plugin` | `IResourceThrottler` | SPI wiring; current provider does not enforce limits |

## Working Rules

1. Identify synchronous broker callbacks; never add blocking I/O to setting,
   throttling, or ACL metadata matching.
2. Trace effective configuration first. `classpath:/config.yaml` and
   `./conf/standalone.yml` are not deep-merged.
3. Review `EventType`, topic, body action, headers, and downstream mqs together.
4. Run the product, logging, build, and ZIP-content gates before publishing.

## Critical Boundaries

- Authentication failures deny access. ACL metadata errors fall back to async
  HTTP; non-200 responses and exceptions deny. Disabled ACL and allowlisted
  tenants are explicit bypasses.
- `refreshAfterWrite` exists in ACL configuration but is not applied by the
  current Caffeine builder; do not claim background refresh.
- Capture `event.hlc()` and `event.utc()` in `report()` before asynchronous
  dispatch. The 64-worker queue is unbounded and does not provide backpressure.
- `-Dsetting_provide_init_value=true` enables custom settings and `PING_REQ`.
  Settings are global; `hasResource()` returns `true`, so limits are not enforced.
- Never log full YAML/config objects, passwords, certificates, ACL metadata,
  tokens, or JAAS strings. Per-event success logs must not remain at `INFO` on
  high-throughput paths.
- Logback uses a shared `LoggerContext`; reset can affect broker and sibling logs.
  It is not isolated per-plugin logging.

## References Index

| File | Content | Read when |
| --- | --- | --- |
| [references/auth-acl.md](references/auth-acl.md) | authentication, ACL fast/fallback paths, cache truth | changing connect auth or PUB/SUB/UNSUB checks |
| [references/event-collector.md](references/event-collector.md) | event map, Kafka contract, queue and delivery limits | changing broker events or mqs ingestion |
| [references/setting-throttler.md](references/setting-throttler.md) | setting callback and current throttler behavior | changing broker settings or limits |
| [references/deploy-config.md](references/deploy-config.md) | effective config sources and standalone registration | configuring or deploying plugins |
| [references/runtime-safety.md](references/runtime-safety.md) | logging, sensitive data, shared context, hot paths | reviewing runtime or security changes |
| [references/build-release.md](references/build-release.md) | product versions, build gates, ZIP allowlist | upgrading dependencies or preparing a release |

## Asset

`assets/standalone-register.yml` contains the four provider FQNs and the required
JVM flag without deployment credentials.

---

> 📌 **Last verified**: 2026-08-22, against `bifromq-plugin-pro`.
> Versions, the Java target and BifroMQ SPI packages come from `.thinglinks-product.env` and the
> parent POM — check them there, and note the Enterprise and Community lines differ.
