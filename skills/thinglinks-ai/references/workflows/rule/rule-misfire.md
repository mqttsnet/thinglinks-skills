---
title: 规则不触发或触发异常
description: 用户说规则没生效、或规则跑得比预期频繁/稀少时
requires: [list_rules, list_rule_conditions, get_rule_trigger_stats, get_alarm_records, get_device]
---

# 规则不触发或触发异常

先分清用户说的是哪一种,三种的查法完全不同:

- **一条都没触发** —— 规则跑没跑?条件命中没有?
- **触发了但没出告警** —— 正常现象,条件没命中不产生告警
- **触发得太频繁** —— 走 [threshold-audit](threshold-audit.md) 复核阈值

## 一条都没触发

1. `list_rules` 先看**规则开着吗、此刻在生效时段内吗**。
   停用(`status=0`)、或已启用但 `effectiveNow=false`,规则根本不会跑 ——
   这两种情况下后面几步全是白查,而它们恰恰是实际排查里最常见的原因。
   顶层的 `disabledCount` / `outsideWindowCount` 先看这两个数
2. `get_rule_trigger_stats` 看这条规则**跑没跑**。规则开着、也在生效时段,
   执行次数仍为 0 才说明调度侧有问题
3. 跑了但没出告警,看 `list_rule_conditions` 的条件:阈值、比对的属性、生效的设备范围
4. **按设备筛出 0 条不等于没有规则在盯它** —— 那只是没有专门为这台设备配的条件,
   改按产品查才看得全
5. 确认设备在上报:数据都没有,规则自然不会命中,回
   [iot/data-not-updating](../iot/data-not-updating.md)

## 「失败了多少次」这个问题答不了

规则执行只有 未执行 / 执行中 / 已完成,**平台没有失败态**。
「未执行」是条件没命中或没跑,不是失败,不要拿它充数。

这一点与桥接和 OTA 相反,那两个域有真实的失败态 ——
别把这里的结论套过去,见 [orchestration/domains/rule](../../orchestration/domains/rule.md)。

## 频次异常的判读

规则跑很多次但很少出告警是**正常**的:条件没命中。
告警数远多于预期才要去看阈值与防抖配置。

给结论时把两个数一起给:执行多少次、其中产生多少条告警。只给一个数,用户判断不了这是不是异常。
