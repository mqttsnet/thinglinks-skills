# Event Collector

`IEventCollector.report()` clones the broker event, captures `event.hlc()` and
`event.utc()` synchronously, then dispatches processing to a 64-worker queue.
Capturing before dispatch preserves the source event metadata across worker
scheduling; do not recompute it in a worker.

## Routing Contract

`TOPIC_MAP` and `EventProcessorFactory` must both contain an event. Missing either
mapping discards the event with a warning.

| Event group | Business action | Kafka topic |
| --- | --- | --- |
| `CLIENT_CONNECTED` | `CONNECT` | `mqtt.client.connected.topic` |
| `BY_CLIENT` | `DISCONNECT` | `mqtt.client.disconnect.topic` |
| `KICKED` | `KICKED` | `mqtt.device.kicked.topic` |
| server/passive disconnect variants | `CLOSE` | `mqtt.server.disconnect.topic` |
| `PING_REQ` | `PING` | `mqtt.ping.req.topic` |
| `SUB_ACKED` / `UNSUB_ACKED` | `SUBSCRIBE` / `UNSUBSCRIBE` | subscription acknowledgement topics |
| `DISTED` | `PUBLISH` | `mqtt.distribution.completed.topic` |
| `DIST_ERROR` | `DISPATCH_ERROR` | `mqtt.distribution.error.topic` |
| unauthorized/session events | audit | audit topics |

The topic prefix is the protocol value `mqtt`; it is not a product-edition name.
Adding an event requires a `TOPIC_MAP` entry, processor registration, an
`EventTypeEnum` business action, and a matching mqs consumer/parser contract.

## Kafka Message Contract

- JSON body contains `eventHlc`, `eventUtc`, processing time, business event
  type, success marker, event fields, and `traceId`.
- Kafka headers always include `X-Trace-Id`; `X-Tenant-Id` is included when the
  event exposes a tenant.
- `clientId` is used as the partition key when available.

The partition key does not restore strict FIFO after work has already been
reordered by 64 workers. Downstream logic must use the event ordering fields it
actually supports.

## Throughput and Delivery Limits

- `TaskQueue` uses an unbounded `LinkedBlockingQueue`; overload grows memory
  instead of applying rejection or backpressure.
- `shutdownNow()` interrupts workers and does not drain queued events.
- Kafka defaults favor throughput: `acks=1`, idempotence off, five retries,
  LZ4, 128 KiB batches, 20 ms linger, and a 256 MiB buffer.
- Asynchronous send failures are logged, with no local outbox or replay queue.

This is not an end-to-end lossless delivery guarantee. Capacity, shutdown, and
Kafka outage behavior need explicit tests before stronger reliability claims.
