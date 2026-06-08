# thinglinks-web

ThingLinks **前端控制台**开发辅助 Agent Skill —— 帮 AI Agent 在 `thinglinks-web-pro`(Vue3 + Vben Admin + Ant Design Vue)上开发:IoT 页面、API 层、路由/权限、共享组件、i18n、规则脚本调试面板。

> 同家族:`thinglinks-cloud`(云端业务)、`thinglinks-util`(框架底座)。

## 结构

```
thinglinks-web/
├── SKILL.md
├── references/
│   ├── project-structure.md   # 栈/目录/构建/多租户/i18n/store
│   ├── api-request.md         # defHttp / Api 对象范式 / model
│   ├── routing-permission.md  # 菜单驱动路由 / v-hasPermission
│   ├── ui-components.md        # Vben 三件套 + CodeEditor + IoT 共享组件
│   ├── iot-pages.md           # views/iot 模块地图
│   └── rule-script-debug.md   # ScriptDebugPanel + transformDebug
└── agents/openai.yaml
```

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@thinglinks-web -g
```

## 维护约定

- 改完 `npx eslint --fix` 再 `npx eslint`;新增文案中/英/日三处。
- 内容以真实代码为准;组件/路径核对仓库。
