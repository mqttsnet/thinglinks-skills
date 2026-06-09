# 排查(上行不生效 / 影子无数据)

## 0. 总流程:先定位卡在哪一关

```
设备发布 → ①能连/能发吗(ACL) → ②命中转换吗(三要素) → ③脚本执行成功吗 → ④进 datas 吗 → ⑤入库/刷影子吗
```

| 关 | 服务 | 日志锚点 | 含义 |
| --- | --- | --- | --- |
| ① | broker/mqs | `ACL deny` / `Server-initiated disconnect` | 发布主题被 ACL 拒 → 断连 |
| ② | mqs | `[InboundTransform] applied ... -> /v1/devices/.../datas` | 命中并转换成功(无 = 没命中) |
| ③ | rule | logger `groovy.script` | 脚本 `log.*` 输出 |
| ④ | mqs | `Received DEVICE_DATA message` | 进入 datas 处理 |
| ⑤ | mqs | `insert table data success` / `failed … 子表不存在` | 入库成功 / 超表缺失 |

## 常见错误对照

| 现象 / 日志 | 原因 | 解决 |
| --- | --- | --- |
| 一发消息**设备就断开**(`ACL deny`) | 发布主题没被 ACL 放行 | 主题带前导 `/`(匹配 `/#`),或改 ACL 为 `#`/`aw/#`(见 `acl-topic-match.md`) |
| `String cannot be cast to Long` | payload 直接返回 Map,Long 被序列化成 String | payload 用 `JSON.toJSONString`;mid 用 `nextLong()` |
| `MissingMethodException: Date.format` | 用了 `new Date().format(...)` | 改 `SimpleDateFormat` |
| 命令 dataBody 多层 `\\\"` | 双重 `toJSONString` | 只序列化一次(见 `downlink-command.md`) |
| `子表不存在` / `insert ... failed` | 该版本服务的时序超表未建 | 重新发布产品版本(建表 DDL 成功) |
| 调试正确但**真机无数据** | 命中三要素不齐 | 核对 渠道/版本(=设备绑定版本)/主题模式 |
| 影子**部分服务**无数据 | 服务未启用/未发布 | 启用该服务并重新发布版本 |
| `productModel` 为 null/空 | 版本未解析/服务未发布 | `?.` 容错;确保服务发布 |
| 脚本不生效也无报错 | 未命中 → 原样透传 | 看有无 `[InboundTransform] applied`;无 = 没命中(回三要素) |
| 自定义 handler 不生效 | topic 正则不匹配 / 被规则脚本改写了 topic | 看 `[DevicePublish] dispatch handler=...`;同 topic 勿同时配脚本+handler |

## 排查顺序(真机)

①broker 收到上行 / 有无断连 → ②mqs `[InboundTransform] applied` → ③`groovy.script` 脚本日志 → ④`Received DEVICE_DATA message` → ⑤`insert table data` 成功/报错。

## 在线调试注意

- 调试**只验脚本逻辑,不校验 ACL/主题/版本** → 调试通过 ≠ 真机命中;
- 日志要用注入的 `log`(不是自建 logger)才回显调试台;
- 「变量检视」`device`/`product`/`productModel`/`config` 为空 → 设备/产品未命中缓存或服务未发布。
