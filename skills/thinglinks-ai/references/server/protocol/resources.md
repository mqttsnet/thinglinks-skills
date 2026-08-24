# 资源(resources):工具之外的第二个协议原语

服务器同时声明 `tools` 与 `resources` 两种能力,**不是二选一**:

```java
.capabilities(McpSchema.ServerCapabilities.builder()
        .tools(true)
        .resources(false, true)   // (subscribe=false, listChanged=true)
        .build())
```

工具是「模型自己决定要查」,资源是「客户端按 URI 去读」—— 后者可被缓存、可由用户主动挂进
上下文,不必每次都花一轮对话让模型去调用。

当前只暴露了一个:**产品物模型**。

| | 值 |
| --- | --- |
| URI 模板 | `thinglinks://product/{productIdentification}/thing-model` |
| mimeType | `application/json` |
| 注册方式 | `.resourceTemplates(...)`,模板匹配交给 SDK 的 `McpUriTemplateManagerFactory` |

选中物模型是因为它**是所有返回里最大的一个**(实测 8200 字符),而同一个产品在一次排查里
往往要看好几次。做成资源就只传一次。

## 取数必须与工具同源

`McpThingModelResource` 持有 `ThingModelTool`,读处理器直接调它 —— 租户校验、服务数上限、
字段裁剪都在工具那边,资源这层只做两件事:从 URI 里取产品标识、把结果序列化成 JSON。

**不要为资源另写一份取数。** 各写一份的话,两条路会慢慢给出不一样的物模型,
而这种偏差没有任何报错 —— 模型拿到哪一份取决于客户端走了哪条路。

## 读失败要抛异常,不能回空内容

「资源读不到」与「这个产品没有物模型」是两件事。回一个空 JSON 会让调用方以为产品确实没配服务。

URI 解析同理:模板匹配后 SDK 给的是原始 uri,自己按固定前后缀取中段,
**取不到时明确报错而不是回空串** —— 空串会一路走到下游变成一次「产品不存在」,
排查时看不出真正原因是 URI 写错了。

## 不做成 `@Bean`

它只被服务器构造用一次。声明成 bean 反而多一个可被别处注入的入口,而这个类没有对外复用的价值。

## 加一个新资源要同步什么

1. 写资源类,**取数复用已有工具**,不新起一条取数路径
2. 在 `McpServerConfiguration` 的 `.resourceTemplates(...)` 里加进去
3. URI 模板常量与 skill 的调度层说明**同步改** —— 模型是按 skill 里写的 URI 去读的
4. 在 `orchestration/domains/<域>.md` 里写清它与对应工具的分工,
   尤其是「上下文里已经挂了资源就不要再调工具」这条,否则等于白花一轮
