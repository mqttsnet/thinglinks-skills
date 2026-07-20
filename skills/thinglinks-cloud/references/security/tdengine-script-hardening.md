# TDS 与脚本安全硬化

## TDengine SQL

TDengine DDL/标识符不能完全依赖 `#{}` 参数化。保留 `${}` 只限不可绑定的标识符或类型 token,其它请求值一律用 `#{}`。

| 数据 | 做法 |
| --- | --- |
| 库/表/超表/列/tag 名 | `TdsSqlGuard` 白名单校验后再拼接 |
| `fieldValue`、时间、size 等值 | MyBatis `#{}` 绑定 |
| TDengine 类型 | 枚举值输出,不要接收任意字符串 |
| `DESCRIBE` / DDL | 先 guard 再渲染;避免让 Druid 看到 `DESCRIBE ? ?` |

Guard 要点:
- 标识符只允许字母/数字/下划线,字母或下划线开头。
- 表名/超表名可能超过 64 字符,不要用过短上限误杀系统生成表名。
- service 层校验不够时,mapper/拦截器层也要兜底。
- Druid `merge-sql` 遇 TDengine 占位符噪音大时可关闭,不等于关闭慢 SQL 统计。

## Groovy / SpEL / FreeMarker

脚本面要按执行引擎分别治理,不要把 rule 引擎、base glue、util-pro compiler 混成一个入口。

| 表达式面 | 最小硬化 |
| --- | --- |
| Groovy glue | 编译期 AST 扫描,禁进程/反射/类加载/文件/`getBean`;拦 `@ASTTest`、`@Grab`;加执行超时 |
| 规则脚本 | 移除测试注册/性能接口;限制注入变量;审计已存脚本 |
| SpEL | 用 `SimpleEvaluationContext`,不要 `StandardEvaluationContext` 暴露类型/构造/静态调用 |
| FreeMarker | `SAFER_RESOLVER`,禁 `?api`;不要允许模板实例化任意类 |

不要一刀切禁 `System`:官方规则脚本可能用 `System.currentTimeMillis()`。应禁止危险方法/类型和 Spring 容器后门,保留普通时间取值。
