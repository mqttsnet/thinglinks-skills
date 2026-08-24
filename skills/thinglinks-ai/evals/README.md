# 行为用例

每条用例给出一个**会诱发错误答法的工具返回形状**,断言写的是「答案里必须成立什么」。
取值全是占位,不含任何真实租户数据。

用例来源是真机调用中实际观察到的返回形状 —— 这几种的共同点是:
**不带本 skill 时给出的错误答案读起来完全合理**,用户没有办法自行察觉。

当前 **30 条用例、113 项断言**,`boundaries/` 与 `workflows/` 共 22 篇每篇至少一条。

## 怎么用

本仓没有内置执行器。两种跑法:

- **人工**:把 fixture 当作工具返回喂给装了本 skill 的客户端,逐条核对断言
- **自动**:用支持 skill 的评测框架加载 `evals.json`,对照组是不加载本 skill 的同一模型

改动 `references/workflows/**` 或 `references/boundaries/**` 之后建议跑一遍 ——
这几条覆盖的都是「错了也看不出来」的那类回答。

改完用例本身跑一次自检:

```bash
python3 scripts/check_evals.py
```

校验 id 连续、name 不重复、每条都有断言、`covers` 指向真实存在的篇目,并打印覆盖矩阵。
少一篇没有用例守护就退出码非 0 —— 加篇目忘了配用例会当场红。

## 覆盖矩阵

每条用例的 `covers` 指向它守护的那一篇。

| 篇目 | 用例 |
| --- | --- |
| boundaries/read-only | 14 |
| boundaries/identity-injection | 24 |
| boundaries/data-visibility | 23 |
| boundaries/unanswerable | 5, 9, 17, 19, 22 |
| workflows/answering-contract | 3 |
| workflows/evidence-rules | 20 |
| workflows/iot/device-offline | 25 |
| workflows/iot/data-not-updating | 1 |
| workflows/iot/never-reported | 4 |
| workflows/iot/shadow-analysis | 6 |
| workflows/iot/baseline-profile | 29 |
| workflows/iot/anomaly-cross-check | 28 |
| workflows/iot/fault-triage | 30 |
| workflows/iot/ota-not-applied | 11, 12 |
| workflows/iot/command-not-effective | 13 |
| workflows/rule/threshold-audit | 7 |
| workflows/rule/rule-misfire | 8, 10 |
| workflows/rule/bridge-failure | 15 |
| workflows/view/dashboard-no-data | 16 |
| workflows/platform/permission-denied | 2, 27 |
| workflows/platform/login-and-access | 26 |
| workflows/platform/change-forensics | 18 |
| orchestration/domains/metric | 21 |

## `orchestration/**` 还没有用例,原因写在这里

那 9 篇管的是**选哪个工具、按什么顺序串**,而本文件的每条用例都预先把工具返回摆好了,
等于跳过了选工具这一步。用这种形状去测路由,测到的只是「拿到数据之后怎么答」。

路由恰恰是 36 个工具下最主要的失败面,要测得另起一种用例:
断言写成「必须先调 A 再调 B」「不得跳过前置查询直接调 C」,
执行器要能录下实际的 `tools/call` 序列。

服务端已经逐次打了 `[ai-mcp] call tool=` 与 `[ai-mcp] done tool=` 日志,是现成的证据源 ——
补这一类时不必再改服务端。

在补上之前,不要把当前这 30 条说成「覆盖完整」。
