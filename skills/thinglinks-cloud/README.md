# thinglinks-cloud

ThingLinks **云端业务平台**开发辅助 Agent Skill —— 覆盖系统基础、IoT 与流媒体三域，包括产品配置/部署命名空间、内部接口与多租户治理、设备上下行、物模型、规则脚本、GB28181 和运行时排障。

> 同家族：`thinglinks-util`(框架底座)、`thinglinks-web`(前端控制台)、`bifromq-plugin`(Broker 插件)。

## 结构

```
thinglinks-cloud/
├── SKILL.md              # 入口:架构总览 + 工作流 + References Index + 反幻觉护栏
├── references/           # system / security / iot / video 聚焦文档,按需加载
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
