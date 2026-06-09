# 开发准则(文件放置 + 命名 + 代码风格 + Flexy)

## 1. 按业务域放文件

`src/views/`、`src/api/`、`src/locales/lang/{zh-CN,en-US,ja}/` **三处同名域目录一一对应**。新功能放进对应域,**不要乱放**:

| 域 | 覆盖 |
| --- | --- |
| `iot/` | 物联网核心(link 产品/设备/规则/物模型;rule 规则引擎;mqs) |
| `video/` | 视频监控(设备/通道/录制/告警/dashboard) |
| `card/` | 物联卡(SIM/流量) |
| `basic/` | 系统基础(用户/角色/权限/流程) |
| `devOperation/` | 开发运维(应用/租户/开发者) |
| `thinglinks/` | 平台通用 |
| `sys/` `open/` `demo/` | 系统页 / 开放平台 / 示例 |

> 例:新增视频通道页 → `views/video/channel/` + `api/video/channel.ts` + `locales/lang/*/video/channel.ts`。

## 2. 页面目录文件命名

一个实体页目录(如 `views/iot/link/device/device/`)的标准文件:

| 文件 | 用途 |
| --- | --- |
| `index.vue` | 列表(BasicTable / 卡片视图) |
| `Edit.vue`(PascalCase) | 新增/编辑模态(BasicModal + BasicForm) |
| `detail.vue` 或 `detail/index.vue` | 详情(多 Tab) |
| `<feature>.vue`(camelCase) | 详情子 Tab/面板,如 `basicInfo.vue`、`modelDefinition.vue` |
| `<Feature>Modal.vue` | 业务模态,如 `PublishModal.vue`、`ImportModal.vue` |
| `<entity>.data.tsx` | schema:`columns()` 列 + `cardFields()` 卡片字段 + `createFormSchema()` 表单 |
| `components/` | 页面局部子组件 |

## 3. 组件约定

- **全局共享** → `src/components/`(通用)/ `src/components/iot/`(IoT 业务);PascalCase;`withInstall` 包装(`index.ts` 导出 + `src/Component.vue`)。
- **页面局部** → 页面目录下 `components/` 或同级 `.vue`。
- 优先复用已有组件(见 `ui-components.md`),不重复造。
- **分段切换**(手动/按设备、报文类型这类二选一)用 `<a-radio-group :options option-type="button">`(数据驱动、单组件),**别堆** `<a-radio-button>` 子组件 —— 单组件渲染更稳、更易维护(WS/MQTT 调试页实践)。

## 4. 代码风格(ESLint + Prettier + Stylelint 强制)

| 维度 | 规则 |
| --- | --- |
| 引号 | **单引号** |
| 分号 | **必须** |
| 缩进 | **2 空格** |
| 行宽 | Prettier `printWidth: 100`,ESLint `max-len: 140` |
| 尾逗号 | `all` |
| 组件名 | PascalCase;`vue/multi-word-component-names` off(允许单词名) |
| `@update:modelValue` | 用 `@update:model-value`(`vue/v-on-event-hyphenation` 倾向连字符,见 ScriptDebugPanel 实践) |
| TS | `strict`;`no-explicit-any` off;`no-unused-vars` error(`_` 前缀变量可忽略) |
| Style | Less + scoped;`::v-deep`/`:deep()` 允许;支持 `rpx` |

改完一律 `npx eslint --fix <file>` 再 `npx eslint <file>`(warning 不阻断,error 清掉)。

## 5. Flexy 设计风格

**Flexy** 是平台的一套**设计语言**(不是组件库):面向 IoT/Video 仪表盘的**极简卡片式**风格 —— 白底 + 彩色点缀、卡片布局、统计面板、高对比徽标、蓝/绿/紫 tone 色系。

落地约定:
- **色系**:`src/settings/designSetting.ts` 的 `APP_PRESET_COLOR_LIST`(`#0960bd` 蓝 / `#009688` 绿 / `#8165FF` 紫 / `#ff5c93` / `#ee4f12` …);徽标如 `PropertyMethodBadge`(R 蓝 / W 橙 / RW 紫 / 未知灰)。
- **卡片结构类**:模态内用 `.flexy-header` / `.flexy-body` / `.flexy-card` 命名空间(参考 `views/iot/link/product/detail/PublishModal.vue`)。
- ⚠️ **Flexy 弹窗 CSS 常故意非 scoped**:因为 BasicModal `teleport` 到 body,scoped 选择器命中不到 → 用带 `.publish-flexy-wrap` 等命名空间的全局样式(组件内有注释说明)。
- 参考实现:`product/detail`(header / PublishModal / modelDefinition / publishRecord)、`video/dashboard/stats`、`components/iot/svg`、`PropertyMethodBadge`、`link/operationMaintenance/debug`(WS/MQTT 调试:全宽分段切换 + 高亮设备区块 + 状态圆点 chip)。

> 新做仪表盘/详情/发布类页面,优先沿用 Flexy 卡片 + tone 色系,与既有页面观感一致。
