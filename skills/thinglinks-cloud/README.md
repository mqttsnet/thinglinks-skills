# thinglinks-cloud

ThingLinks **云端业务平台**开发辅助 Agent Skill —— 帮 AI Agent 在 `thinglinks-cloud`(`com.mqttsnet.thinglinks`,模块 broker / mqs / rule / link / public)上开发:规则脚本、上行 TopicHandler、协议信封、下行命令、物模型、落库、bus 扩展、排查。

> 同家族(规划):`thinglinks-util`(框架底座)、`thinglinks-web`(前端控制台)。

## 结构

```
thinglinks-cloud/
├── SKILL.md              # 入口:架构总览 + 工作流 + References Index + 反幻觉护栏
├── references/*.md       # 聚焦小文档,按需加载(渐进式披露)
├── assets/rule-script/   # 规则脚本骨架(复制即改)
└── agents/openai.yaml    # 跨工具(Codex/OpenAI)接口
```

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@thinglinks-cloud -g   # 全局
npx skills add mqttsnet/thinglinks-skills@thinglinks-cloud      # 仅当前项目
```

详见仓库根 README。

## 维护约定

- 内容**以真实代码为准**;易变字段/签名在 reference 里注明"核对 `com.mqttsnet.thinglinks.*`"。
- 每个 reference 聚焦一个子主题,深内容拆分而非堆进 SKILL.md。
