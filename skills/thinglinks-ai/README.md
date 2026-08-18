# thinglinks-ai

ThingLinks **MCP 服务**的使用与建设规范。MCP 服务给能力,这个 skill 给判断力 ——
什么问题选哪个工具、怎么串起来、返回的字段到底是什么意思、什么绝对不能说。

> 同家族:`thinglinks-cloud`(这些字段怎么产生的)、`thinglinks-util`(框架底座)、`thinglinks-web`(控制台)。

## 结构

```
thinglinks-ai/
├── SKILL.md
├── references/
│   ├── orchestration/       # 调度:选哪个工具、怎么串
│   │   ├── routing.md       #   问题 → 域
│   │   ├── chaining.md      #   跨工具串联规律
│   │   └── domains/*.md     #   一个能力域一篇(identity/org/audit/device/metric/rule/ota/view)
│   ├── boundaries/          # 边界:只读、身份注入、可见范围、答不了什么
│   ├── workflows/           # 工作流:输出契约 + 判据 + 16 条场景流程(iot/ rule/ platform/ view/)
│   └── server/              # 建设:架构、协议、加工具、下游契约、接入、构建测试
├── evals/                   # 行为用例:会诱发错误答法的返回形状 + 断言
├── assets/playbook-template.md
├── scripts/check_tool_drift.py
└── agents/openai.yaml
```

`server/` 只给开发 agent。面向客户的 AI 运行时只加载 `orchestration` / `boundaries` / `workflows`。

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@thinglinks-ai -g
```

## 维护约定

- 新增走**加文件**不是改大文件:加能力域 → `orchestration/domains/`;加场景 → `workflows/<域>/`
- 运行时三个目录里**不出现类名、模块路径、SQL 与表名**,那些属于 `server/`
- 工具清单以运行中的 `tools/list` 为准,加工具后跑一次 `scripts/check_tool_drift.py` 对账
- 场景篇 front matter 的 `requires` 要写全依赖的工具名,工具没注册时该篇不对外可见
- 改动 `workflows/` 或 `boundaries/` 后跑一遍 `evals/`,那几条覆盖的是「错了也看不出来」的回答
