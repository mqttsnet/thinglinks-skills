# thinglinks-web

ThingLinks **前端控制台**开发辅助 Agent Skill —— 覆盖 IoT 页面、API/路由/权限、共享组件、i18n、规则脚本调试、规则联动通知，以及产品配置、构建和浏览器配置安全。

> 同家族:`thinglinks-cloud`(云端业务)、`thinglinks-util`(框架底座)。

## 结构

```
thinglinks-web/
├── SKILL.md
├── references/
│   ├── project-structure.md   # 栈/目录/构建/多租户/i18n/store
│   ├── conventions.md         # 文件放置/组件/样式/ESLint
│   ├── api-request.md         # defHttp / Api 对象范式 / model
│   ├── routing-permission.md  # 菜单驱动路由 / v-hasPermission
│   ├── ui-components.md       # Vben 三件套 + CodeEditor + IoT 共享组件
│   ├── iot-pages.md           # views/iot 模块地图
│   ├── rule-script-debug.md   # ScriptDebugPanel + transformDebug
│   ├── rule-linkage-notification.md # 通知渠道/模板/预览/兼容
│   └── product-build-security.md     # 产品清单/构建门禁/前端安全
└── agents/openai.yaml
```

## 安装

```bash
npx skills add mqttsnet/thinglinks-skills@thinglinks-web -g
```

## 维护约定

- 改完用 `pnpm exec eslint --fix` 再校验；新增文案中/英/日三处。
- 发布前执行 `pnpm product:test`、`pnpm product:check` 和 `pnpm build:prod`。
- 内容以真实代码为准;组件/路径核对仓库。
