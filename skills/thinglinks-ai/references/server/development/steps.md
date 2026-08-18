# 加一个工具的完整步骤

1. 在 `ai/tool/<域>/<对象>/` 写能力类,返回**显式构造**的对象,不透传下游实体或 VO
2. 在 `McpServerConfiguration` 注册:同步更新 `SERVER_INSTRUCTIONS`,加 `annotations` 与 `outputSchema`
3. 补单元测试(`thinglinks-ai-biz` 已单独打开 surefire)
4. 重启后 curl 验 `tools/list` 与 `tools/call`
5. 挂真实客户端复验

## 第 4 步必须做的两件事

**带可选入参的工具要额外用空参数 `{}` 调一次。** 不传参数是模型最常走的路径,
而这条路径上的错误单元测试照不到,见 `hard-rules.md` 可选入参那条。

**看返回的是 `structuredContent` 还是 error。** 声明了 `outputSchema` 就会强制校验,
mock 掉 Facade 的单测跨不到序列化那一层。

## 第 5 步为什么不能省

`tools/list` 通过只说明工具装上了,不说明模型会用它。真实客户端复验看的是另一件事:
**用户问一句自然语言,模型会不会选中这个工具。** 选不中,多半是 `description` 写成了
「这是什么」而不是「什么时候用」,或者忘了在 `SERVER_INSTRUCTIONS` 里提。

## 新增工具后要同步的地方

- `SERVER_INSTRUCTIONS`(测试会红,忘不了)
- skill 的 `orchestration/domains/<域>.md`:这个工具在什么问题下被选中、和谁是一对
- 若它让某条排查流程成为可能,补 `workflows/`,并在该篇 `requires` 里声明工具名
