# 规则脚本前端 + 调试面板

页面 `views/iot/rule/groovy/ruleGroovyScript/`:`index.vue`(列表)、`detail.vue`(详情 + 版本切换 + 集成 `ScriptDebugPanel`)、`Edit.vue`(新增/编辑,产品/版本/主题级联 + 代码编辑器)、`ruleGroovyScript.data.tsx`。

## 脚本字段(`api/iot/rule/groovy/ruleGroovyScript.ts`)

端点:`POST page` / `GET detail` / `POST saveGroovyScript` / `PUT updateGroovyScript` / `DELETE {id}` / `POST copy` / `GET execStat/{id}`。
字段:`scriptType`(固定 `topicInboundTransform`)、`channelCode`(mqtt/webSocket)、`productIdentification`、`topicPattern`、`objectVersion`、`enable`、`scriptContent`、`extendParams`(config JSON)、`remark`。
> `channelCode + objectVersion + topicPattern` = 运行时命中三要素(见 cloud `rule-script.md`)。

## 调试面板 `components/iot/ScriptDebugPanel`

props:`scriptContent`、`productIdentification`(限定设备选择器)、`topicPattern`、`historyKey`、`resultName`、`extendParams`、`scriptUniqueKey`、`objectVersion`。
4 Tab:输入(`IotProductPicker`+`IotDevicePicker` 选设备 + 源 topic + 源报文)/ 输出(状态 + context + logs + 异常)/ 变量检视(`BindingKvTable` 数据驱动)/ 历史(localStorage,≤10 条)。权限点 `rule:groovy:ruleGroovyScript:mockDebug`。exposed:`execute()`、`running`、`lastStatus`。

## 调试 API(`api/iot/rule/groovy/transformDebug.ts`)

`debugTransform(params)`:
- `TransformDebugParams{ scriptContent, deviceIdentification, originTopic, originBody, extendParams?, scriptUniqueKey?, objectVersion? }`
- 返回 `{ result, binding, deviceResolved, productResolved }`
  - `result{ executionStatus:'SUCCESS'|'FAILED', context, exception?, errorMessage?, logs?:string[] }`
  - `binding{ originTopic, originBody, clientId, deviceIdentification, productIdentification, device, product, config, productModel }`

## codemirror

`EditorView` 从 `codemirror` meta 包导入(**不要** `@codemirror/view`);`java()` + `oneDark` + `EditorView.lineWrapping`;输出/日志用 `deepParseJson` 展开嵌套 JSON 串 + 美化。
