# 路由:先判断这是哪类问题

用户不会说「请调用 `get_device`」,只会说「这台设备怎么不上报了」。
第一步永远是把这句话归到一个域,再进对应的域文件看选哪个工具。

| 用户在问 | 进哪个域 |
| --- | --- |
| 我是谁、我能不能做某事、谁能做某事、企业/应用什么时候到期 | [identity](domains/identity.md) |
| 有哪些部门、某部门有谁、某人还在职吗 | [org](domains/org.md) |
| 谁改的、我改过什么、谁登录过、有什么消息 | [audit](domains/audit.md) |
| 这台设备什么状态、有哪些设备、物模型是什么、下发过什么命令 | [device](domains/device.md) |
| 这段时间怎么变的、平均多少、哪台不正常 | [metric](domains/metric.md) |
| 为什么一直报警、阈值对不对、最近告警多少、数据为什么没进库 | [rule](domains/rule.md) |
| 升级成了吗、哪几台失败、设备都在什么版本 | [ota](domains/ota.md) |
| 下发的命令有没有生效 | [device](domains/device.md) |
| 有哪些大屏、这个图为什么没数据 | [view](domains/view.md) |
| 连不上、凭证有没有问题 | `check_mcp_connection`,只用于排查接入,不要拿它回答业务问题 |

## 一句话对应多个域时,按证据链排序

「设备离线了」看起来是 device,但完整回答往往要跨域:先 device 确认是不是真断链,
再 ota 看断线时间点附近有没有升级,再 metric 看停报之前的数据形态。

跨域时不要并行发散 —— 按 [workflows](../workflows/) 里对应场景的顺序走,
每一步的结果决定下一步查什么。发散查一堆再汇总,既慢又容易把无关数据混进结论。

## 问题归不到任何域

先说清楚当前能查到什么、查不到什么,再问用户要具体对象(设备标识、时间范围、规则名)。
猜一个对象去查,查到了也不是用户要的那个。

能力之外的请求见 [boundaries/unanswerable](../boundaries/unanswerable.md)。
