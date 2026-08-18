# outputSchema:反射生成与强制校验

## 不手写 schema

两个硬理由:

1. SDK 对声明了 `outputSchema` 的工具会**强制校验** `structuredContent`。
   schema 与实际返回对不上,整次调用变成 error —— 手写的漂移是运行期故障,不是编译期问题
2. 字段说明已经写在 VO 的 `@Schema` 上,手写等于维护两份

所以 schema 由 `ToolOutputSchema` 从返回值 VO 反射生成,嵌套深度上限防御自引用类型。

## 生成的 schema 刻意宽松

每个字段允许 null、不产出 `required`、不加 `additionalProperties: false`。

这样 VO 增删字段、或某字段恰好为空,都不会把一个本来正常的工具变成报错。
**校验的目的是防止形状漂移,不是给返回值加业务约束** —— 业务约束写在这里只会在半夜炸。

## 校验盲区

给 Object 类型的字段声明了 `type`,数值返回会让整体 `isError` —— 表现是工具明明取到数据,
客户端却收到一次失败调用。

**工具单元测试照不到这一层**:测试 mock 掉 Facade,走不到序列化与 schema 校验。
所以新工具必须真机调一次,看返回的是 `structuredContent` 还是 error。
