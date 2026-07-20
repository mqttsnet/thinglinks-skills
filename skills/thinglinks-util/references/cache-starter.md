# 缓存与锁(cache-starter)

包 `com.mqttsnet.basic.cache`。配置前缀 `thinglinks.cache`，默认后端为 `REDIS`；`CAFFEINE` 只适合单机开发、测试或演示。

## 后端边界

| 能力 | Redis | Caffeine |
| --- | --- | --- |
| KV / 基础计数 | 跨节点 | 单 JVM |
| Pub/Sub | 支持 | `publish` 仅告警并 no-op |
| Set / ZSet 等 Redis 结构 | 支持 | 多个方法未实现，可能返回 `null`/空值 |
| 锁 | Redis `SET NX` + 固定 TTL | 本地 `ReentrantLock` |

不要把后端切换理解为完整语义兼容。依赖 Pub/Sub、Redis 数据结构或跨节点互斥时必须使用 Redis。

## Typed cache-aside

| 数据 | 普通 key | Hash field | 存储格式 |
| --- | --- | --- | --- |
| 单对象 | `getOrLoad` | `hGetOrLoad` | 框架默认多态序列化 |
| `List<E>` | `getOrLoadList` | `hGetOrLoadList` | 纯 JSON + `elementClass` |

同一 key/field 不得混用单对象与 List API。List 解析旧格式或损坏数据失败时会调用 loader，并以纯 JSON 回填；loader 异常时返回空 List。

`cacheNullValues=true` 时 List API 写入 JSON `[]`。普通 key 读取 `[]` 会命中；Hash 版当前用“非空集合”判断命中，因此缓存 `[]` 仍会回源，不能依赖它完成 Hash 空列表防穿透。

`hGetOrLoad` 的 null 哨兵会直接返回 `Optional.empty()`，不会再次回源。

## 锁语义

- 默认 TTL 5000ms，重试 5 次，间隔 500ms。
- `RedisDistributedLock` 不是 Redisson：没有看门狗、自动续期或可重入保证；释放使用 UUID 比值 + Lua 删除。
- Redis token 只有一个 `ThreadLocal` 值，同线程嵌套持有多把锁会覆盖 token，避免这种调用方式。
- `CaffeineDistributedLock` 只在当前 JVM 生效，并忽略调用方传入的 `expire`。
- 有返回值的 `tryLockAndRun` 在 Redis 与 Caffeine 对业务异常的 `LockRunResult` 分类不同，调用方不要把结果码当成跨后端一致协议。
