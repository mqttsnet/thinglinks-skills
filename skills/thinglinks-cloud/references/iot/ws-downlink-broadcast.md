# WS 下行广播 + 设备会话注册表

`thinglinks-broker` 的 WebSocket 下行投递与多节点会话管理。**重构要点**:旧 `SessionOwnerRegistry`(Redis 存 `ip:port` + RestTemplate 反向点对点路由)已**整体废弃**,换成 `WsDeviceSessionRegistry`(只答"在不在线",**不路由**)+ **RocketMQ `BROADCASTING` 广播扇出**。

## 核心理念(先记这一条)

- **"谁持有 socket"的唯一真相 = 各节点本地内存 `WebSocketSubject.Holder`**(`clientId → session`),**不是 Redis**。
- Redis(`WsDeviceSessionRegistry`)只回答"**这设备全局在不在线**",用于下发前快速拦截。
- **路由 = 广播给所有节点 + 只有持有者动手**。不存节点地址、无反向调用。

## 类 / 职责

| 类 | 模块 / 包 | 职责 |
| --- | --- | --- |
| `WsDeviceSessionRegistry` | broker-biz `broker.common.session` | Redis 在线注册表:`save`/`get`/`isOnline`/`remove`。Redis 失败均 warn 不阻断 |
| `WsDeviceSessionInfo`(VO) | common `common.cache.broker.ws` | 会话信息 VO(JSON 存 Redis + 本地 `userProperties` 鉴权门)。`SESSION_KEY="wsDeviceSessionInfo"`;**无 nodeId/ip 字段**(刻意不存路由) |
| `WsDeviceSessionCacheKeyBuilder` | common `common.cache.broker.ws` | 拼 Redis key,TTL **90s** |
| `WebSocketBrokerServiceImpl` | broker-biz `broker.ws.service.impl` | **`publishMessage`** 生产者:编码 + 在线校验 + 本地优先否则广播;`publishLocal` 本地投递 |
| `WsCommandBroadcastEvent`(事件) | mqs-entity `entity.ws.command` | 下行广播事件:`tenantId/clientId/encodedMessage(已编码帧)/ts` |
| `WsCommandDownlinkListener` | broker-biz `broker.ws.command` | **下行 BROADCASTING 消费者**:本节点持有该 socket 才 `publishLocal`,否则忽略 |
| `WsHeartbeatTracker` / `WsHeartbeatSyncListener` / `WsHeartbeatTimeoutChecker` | broker-biz `broker.ws.heartbeat` | 心跳:本地刷新 + 广播同步 + 30s 扫描(关超时 + 回写 Redis 续 TTL 自愈) |
| `WebSocketDeviceOpenAccessProtocolEndpoint` | broker-controller `broker.ws.endpoint` | `@ServerEndpoint`;`@OnOpen` 注册 Redis、`@OnClose` 移除、`@OnMessage` 经 tracker 刷新 |

## 下行广播流(设备下发 → 持有节点 → WS 客户端)

```
业务侧(规则 / 手动命令)PublishWebSocketMessageRequestVO(clientId/topic/payload/tenantId)
   ▼
任意 broker 节点 ── WebSocketBrokerServiceImpl.publishMessage()
   ├ 1. 在线校验 WsDeviceSessionRegistry.isOnline(tenantId,clientId) → 不在线 throw "设备不在线"(不广播)
   ├ 2. 编码一次 WsCommandProtocolEncoder.encodeDown → WS 子协议 JSON 帧
   ├ 3. 本地优先:Holder.get(clientId)!=null(设备就在本节点)→ publishLocal → notify → sendText ─► WS 客户端
   └ 4. 不在本地 → broadcast:rocketmqTemplate.asyncSend(WebSocket.COMMAND_DOWNLINK, WsCommandBroadcastEvent)
            ▼  RocketMQ topic "thinglinks-ws-command-downlink"(BROADCASTING,每个节点都收到)
        node-1 / node-2(持有者)/ node-N 各自 WsCommandDownlinkListener:
            Holder.get(clientId)==null → 忽略 ;  持有者 → publishLocal → notify → sendText ─► WS 客户端
```

**恰好一个节点(socket 持有者)投递,其余静默忽略。** `publishLocal` 内部再核一次本地 Holder,不在则抛 "Local ws session not found"(非持有者误调也安全空转)。

## 关键常量

| 常量 | 值 | 出处 |
| --- | --- | --- |
| 下行广播 topic | `thinglinks-ws-command-downlink` | `BizMqRouteConstant.WebSocket.COMMAND_DOWNLINK` |
| 下行消费组前缀 | `CID_THINGLINKS_WS_COMMAND_DOWNLINK_` + `${spring.application.name}` | `BizMqRouteConstant.Groups.WS_COMMAND_DOWNLINK_PREFIX` |
| 心跳同步 topic | `thinglinks-ws-heartbeat-sync` | `BizMqRouteConstant.WebSocket.HEARTBEAT_SYNC` |
| 会话缓存 key 段 | `def_ws_session`(模块 `broker`,TTL 90s) | `CacheKeyTable.Broker.WS_SESSION` |

> Key 形如 `{prefix}:{tenantId}:broker:def_ws_session:id:obj:{clientId}` → `WsDeviceSessionInfo`。消费者均带 `@ConditionalOnProperty(rocketmq.name-server)`,无 MQ 时降级为纯本地单机。

## 心跳与 TTL 自愈

- 设备上行/PING → 持有节点 `WsHeartbeatTracker.update`:本地 `touchLastActiveTime` + 广播 `WsHeartbeatSyncEvent`。**每条上行不直接写 Redis**(避免每包一次 Redis 写)。
- `WsHeartbeatTimeoutChecker` 每 30s:空闲 ≤ 超时 → `refreshRedisSession`(`registry.save` 续 TTL + 自愈);超时 → 关 socket → `@OnClose` → `registry.remove`。
- 不变式:**本地持有 session ⟺ Redis 有 session 信息**(连着不说话的设备也由 30s 扫描续上)。

## ⚠️ 反幻觉

- 旧 `SessionOwnerRegistry` / `ip:port` 反向路由**已删**,别按它写;现在"注册表(在线)"与"广播(投递)"两件事拆开。
- 下行能否送达取决于**本地 `WebSocketSubject.Holder`**,不是 Redis;Redis 只做在线拦截。
- 广播是 **RocketMQ `BROADCASTING`**(每节点一份)而非 `CLUSTERING`。
- 类名/行号随版本演进,核对真实代码 `com.mqttsnet.thinglinks.broker.*` / `...common.cache.broker.ws`。
