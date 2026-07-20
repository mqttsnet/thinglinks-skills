# Authentication and ACL

The auth plugin implements `IAuthProvider` for MQTT 3 and MQTT 5 connections,
then reuses authentication metadata for PUB/SUB/UNSUB authorization.

## Authentication

`auth()` builds a request with client, channel, remote-address, credential, and
certificate data and calls the ThingLinks Link service asynchronously. A missing
response or `certificationResult=false` returns a BifroMQ not-authorized result.

On success, `ClientInfo` receives:

- `tenantId` and device identification;
- serialized `DeviceInfo` metadata;
- enabled device ACL rules when returned by the service.

These fields are authorization inputs and may contain sensitive data. Do not log
the credential, certificate, complete metadata map, or complete response.

## ACL Decision Order

1. `acl.enabled=false` allows the action.
2. A tenant in `tenantWhitelist` allows the action.
3. `AsyncCache` deduplicates concurrent misses by
   `clientId|actionType|normalizedTopic`.
4. Client metadata rules are filtered by action, sorted by ascending priority,
   expanded for `{deviceId}`, `{productId}`, and `{clientId}`, then the first
   matching topic rule decides allow or deny.
5. Missing, inapplicable, or malformed metadata rules fall back to the
   asynchronous ACL HTTP endpoint.
6. Only HTTP 200 allows. Network errors, non-200 responses, and escaped cache
   loader exceptions return `false`.

The final decision is fail-closed, but disabling ACL and tenant allowlisting are
explicit bypasses and require deployment review.

## Cache Truth

| Item | Current behavior |
| --- | --- |
| Backend | Caffeine `AsyncCache<CacheKey, Boolean>` |
| Packaged config | max 2,000,000 entries; expire after write 10 minutes |
| Java fallback | max 1,000,000 entries; expire after write 10 minutes |
| Concurrent miss | one shared loader future per key |
| Loader exception | not cached; current request is denied |
| `refreshAfterWrite` | configuration field exists but builder never applies it |

Do not describe the cache as refreshing after two minutes until the builder uses
`refreshAfterWrite` and tests cover refresh failure semantics.

## Review Checklist

- Keep HTTP calls asynchronous and CPU matching off the broker event loop.
- Preserve priority-first, first-match semantics when changing ACL rules.
- Test MQTT 3 and MQTT 5 rejection behavior.
- Test metadata allow/deny, metadata fallback, non-200, timeout, disabled ACL,
  and tenant allowlist separately.
