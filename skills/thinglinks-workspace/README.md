# thinglinks-workspace

ThingLinks **双产品线工作区定位** Agent Skill —— 帮 AI Agent 找对仓库与路径:社区 monorepo(`thinglinks`)↔ 旗舰独立仓(`*-pro`)的工程映射、治理文件归口、版本线与 `bump-version.sh`、`changelogs/` 每版一文件、Nacos 模板占位符规则;并内置**跨工程安全基线**(硬性指标检查表)。

> 同家族:`thinglinks-cloud`(云端业务)、`thinglinks-web`(前端)、`bifromq-plugin`(Broker 插件)、`thinglinks-util`(框架底座)。

## 结构

```
thinglinks-workspace/
├── SKILL.md                          # 仓库映射 / 治理归口 / 版本线 / 变更日志 / 凭证规则 / 提交风格
├── references/
│   └── security-baseline.md          # 安全硬性指标 7 组红线(MUST/禁止 检查表)
└── agents/openai.yaml
```

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@thinglinks-workspace -g
```

## 维护约定

- 仓库结构 / 版本线 / 模板规则变更时同步本 skill;安全基线只收**硬性**条目(违反即阻断),机制讲解归各工程 skill。
