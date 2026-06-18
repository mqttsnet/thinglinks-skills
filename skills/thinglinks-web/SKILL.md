---
name: thinglinks-web
description: >
  Use when developing the ThingLinks frontend console repo thinglinks-web-pro (Vue3 +
  Vben Admin + Ant Design Vue + Vite + TypeScript + Pinia): building IoT pages under
  src/views/iot (device / product / rule / OTA / operationMaintenance debug / accessControl),
  defining API calls with defHttp, using shared IoT components (IotProductPicker,
  IotDevicePicker, IotProductVersionPicker, ProductTopicPicker, ScriptDebugPanel,
  ScriptTemplatePicker, BusinessCardList 卡片列表/版本选择器), the rule
  script Groovy debug panel, Vben BasicForm/BasicTable/BasicModal with useForm/useTable/
  useModal, the CodeEditor (codemirror), menu-driven routing + v-hasPermission, adding i18n
  (zh-CN/en-US/ja), or drawing flow diagrams (Excalidraw). Trigger whenever the user works
  on the 前端 / 控制台 / Vue page / 脚本调试面板 / 物模型编辑 of ThingLinks.
---

# ThingLinks Web (frontend console)

> 适用两条产品线:旗舰仓 `thinglinks-web-pro` 与社区 monorepo 子目录 `thinglinks/thinglinks-web`(代码同构)。仓库映射见 `thinglinks-workspace`。

`thinglinks-web-pro`:**Vue 3 + Vben Admin + Ant Design Vue + Vite + TypeScript + Pinia + vue-i18n**。多租户构建(`VITE_GLOB_MULTI_TENANT_TYPE`:NONE / COLUMN / DATASOURCE_COLUMN)。

## 工作流

1. **加页面**:在 `src/views/iot/<域>/` 建页;数据/表单 schema 放 `*.data.tsx`;路由**后端菜单驱动**(不硬编码)。
2. **调接口**:在 `src/api/iot/<域>/` 定义 `Api` 对象 + 服务函数(`defHttp`);类型放 `model/`。
3. **复用组件**:优先用 `src/components/iot/` 的 IoT 业务组件 + Vben 基础组件(BasicForm/Table/Modal)。
4. **加文案**:`src/locales/lang/{zh-CN,en-US,ja}/...` **三处都改**。
5. **校验**:`npx eslint --fix <file>` 再 `npx eslint <file>`(warning 不阻断,error 清掉)。
6. **画图**:流程/架构图一律 **Excalidraw**。

## ⚠️ 重要(反幻觉/踩坑)

- 权限点匹配是**通配符**(`module:sub:action` / `module:*:action` / `*`);用 `v-hasPermission` 指令或 `usePermission().hasPermission`。
- codemirror 的 `EditorView` 从 **`codemirror`** meta 包导入(**不要** `@codemirror/view`,未 hoist);换行 `EditorView.lineWrapping`。
- API 统一返回 `{ code, message, data, timestamp }`,拦截器在 `utils/http/axios/axiosTransform.ts`。
- **AntD 全局注册 + tree-shaking 坑**:只在模板用 `<a-xxx>`、没在入口按名 import 的 antd 组件,**生产构建**会被摇掉 → 运行时退化成原生元素(`a-card` 头部/`#extra` 整块消失等);**dev 正常、只生产构建/部署才丢**。`main.ts` 需显式 `app.use(Card).use(Typography)`(详见 `references/conventions.md`)。
- 组件/路径/约定随版本演进,核对真实代码。

## References Index

| File | Content | When to read |
| --- | --- | --- |
| [references/project-structure.md](references/project-structure.md) | 技术栈、`src/` 目录、构建脚本、多租户、i18n、store/字典 | 总体上手、找东西放哪 |
| [references/conventions.md](references/conventions.md) | 开发准则:按业务域放文件(iot/video/card…)、页面文件命名、组件约定、代码风格(ESLint/Prettier)、**Flexy 设计风格** | 新建页面/组件、对齐风格 |
| [references/api-request.md](references/api-request.md) | `defHttp`、`Api` 对象范式、ServicePrefixEnum、model、统一返回 | 写/改接口调用 |
| [references/routing-permission.md](references/routing-permission.md) | 菜单驱动路由、`v-hasPermission`、`usePermission`、通配权限点 | 加页面/按钮权限 |
| [references/ui-components.md](references/ui-components.md) | Vben BasicForm/Table/Modal + useForm/useTable/useModal、ApiSelect、CodeEditor、ECharts、IoT 共享组件 | 找组件/表单/表格/弹窗 |
| [references/iot-pages.md](references/iot-pages.md) | `src/views/iot` 模块地图(link/rule/mqs)+ 对应 api/组件 | 在某 IoT 域加页面 |
| [references/rule-script-debug.md](references/rule-script-debug.md) | `ScriptDebugPanel` props、`transformDebug` API 字段、codemirror、设备选择器 | 改规则脚本调试面板 |

## Assets

`assets/page-scaffold.md` — 标准 IoT 列表+编辑页脚手架(api / `data.tsx` / `index.vue`,复制改名即用)。

## 相关 skill

- **[`thinglinks-cloud`](../thinglinks-cloud/)** — 前端调用的后端:上行/下行链路、规则脚本契约、物模型、设备影子。

---

> 📌 **最后核对**:`thinglinks-web-pro` · 2026-06-18(两线同构)。组件/路径/约定随版本演进,落地前请核对真实代码。
