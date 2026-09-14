# 构建与测试

## 新环境先装框架仓

必须先构建安装 `thinglinks-util-pro`:`com.mqttsnet.basic:*` 不在任何公开仓,
根 pom 也没有消费用的 `<repositories>`,否则整个 cloud 仓都编不动。

## `mvn -pl` 必须带 `-am`

漏了 `-am` 的报错与 Lombok 注解处理失效**一模一样**:大批「找不到符号」,而且报在没改过的文件上。
先加回 `-am` 重跑,再怀疑注解处理 —— 顺序反了会白查半天。

## 测试落在哪一层

| 测什么 | 放哪 | 为什么 |
| --- | --- | --- |
| 工具取数与裁剪 | `thinglinks-ai-biz` | mock Facade,快 |
| 可选入参对齐 | `thinglinks-ai-server` | 唯一同时依赖 base 与 system 两个 `cloud-impl` 的模块,能反射到真实 HTTP Interface |
| `ToolInstructions` 与工具清单一致 | `thinglinks-ai-biz` | 加工具忘了同步会红 |
| 每个 `ToolGroup` 都能被组件扫描发现 | `thinglinks-ai-biz` | 漏标 `@Component` 的那一组,工具会静默消失 |
| `ToolDefinition` 转协议规格 | `thinglinks-ai-biz-mcp` | 适配层单独有测试,与能力层分开 |
| facade 装配 | `thinglinks-ai-server` | biz 只需接口,少 cloud-impl 编译全过、启动才炸 |

## 单元测试照不到的三处

这三处只能靠真机调用发现,加工具时逐条过:

1. **可选入参**:mock 掉 Facade,跨不到 HTTP Interface 的 `@RequestParam` 校验
2. **outputSchema 校验**:mock 跨不到序列化与 schema 校验
3. **模型选不选得中**:`tools/list` 通过不代表模型会用它,要挂真实客户端问一句自然语言
