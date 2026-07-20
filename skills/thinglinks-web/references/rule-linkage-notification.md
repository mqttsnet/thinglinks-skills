# 规则联动通知编辑器

入口：`src/views/iot/rule/engine/linkage/components/modal/TriggerAlarm.vue`。它编辑场景联动的告警动作，不是 `views/iot/rule/alarm` 下的告警渠道管理页。

## 稳定模型

| 渠道 | `channelType` | 默认格式 |
| --- | ---: | --- |
| 钉钉 | `0` | `MARKDOWN` |
| 企业微信 | `1` | `MARKDOWN` |
| 飞书 | `2` | `TEXT` |
| 站内信 | `3` | `NOTICE` |

类型和预设集中在 `notificationTemplates/`：`types.ts` 定义渠道编号，各渠道文件定义模板，`index.ts` 汇总预设、默认模板和创建函数。新增渠道时同步修改渠道常量、`DEFAULT_CHANNELS`、预设/默认映射、三语言文案、校验与测试；不要在 `TriggerAlarm.vue` 里散落模板正文。

## 接收人与校验

接收人类型：`PHONE`、`EMPLOYEE`、`ALL`。`template.recipients` 非空时覆盖全局 `recipients`，否则继承全局列表。

`notificationConfig.mjs#getNotificationValidationErrorKey` 是统一校验入口：

1. 至少启用一个渠道；
2. 站内信必须有 `EMPLOYEE`；
3. 钉钉、企业微信、飞书未开启 `atAll` 时必须有 `PHONE` 或 `ALL`；
4. 每个启用渠道的 `titleTemplate` / `contentTemplate` 都不能是空白字符。

只校验启用渠道。不要在组件的“下一步”“提交”分支各复制一套规则。

## 预设、变量与 i18n

- 预设保存 `titleTemplateKey` / `contentTemplateKey`，通过当前语言的原始消息解析；`${alarm.name}` 一类占位符必须原样保留，不能交给 i18n 插值器消费。
- 变量优先请求 `GET /rule/ruleNotification/variables`，失败或空列表时使用 `FALLBACK_NOTIFICATION_VARIABLE_GROUPS`。
- 已知 `groupCode` / variable key 映射到稳定三语言 key；未知编码继续展示服务端 `groupName` / `label` / `description`，保证后端先扩展时前端仍可用。
- 插入模板时使用服务端给出的 `placeholder`，不要从 label 反推 `${...}`。

## 预览与提交

预览调用 `POST /rule/ruleNotification/preview`：

```ts
{
  alarmIdentification,
  recipients,
  channelTemplates: enabledTemplates,
  sampleVariables?,
}
```

渲染结果在 `channels[]` 中按 `channelType` 匹配当前预览。API 失败要清空旧预览，不能继续显示上一次结果。

提交给父级的动作对象保留兼容字段：

- `version: 2`、`alarmIdentification`、`alarmName`；
- 新结构 `recipients` + `channelTemplates`，模板包含明确的 `enabled`；
- 兼容字段 `atPhone`(PHONE/ALL 逗号串)与 `contentData`(首个启用模板正文)。

编辑已有动作时优先读取新结构；缺少 `recipients` 时从 `atPhone` 恢复 PHONE 接收人，缺少 `channelTemplates` 时用 `contentData` 初始化默认模板并只启用钉钉。不要在仍需兼容旧数据时删除这些字段。

## 验证

```bash
pnpm test:notification
pnpm product:test
pnpm exec eslint --fix \
  src/views/iot/rule/engine/linkage/components/modal/TriggerAlarm.vue \
  src/views/iot/rule/engine/linkage/components/modal/notificationTemplates
```

测试至少覆盖：无渠道、机器人接收人、站内信员工、渠道级覆盖、空模板、已知/未知变量和 `${...}` 占位符保留。
