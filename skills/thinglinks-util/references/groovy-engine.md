# Groovy 引擎(groovy-engine-starter)

包 `com.mqttsnet.basic.groovy`。cloud 的规则脚本/转换就是用它跑。开关 `thinglinks.groovy.engine.enable=true`。

## 执行入口 EngineExecutor(`executor`)

```java
EngineExecutorResult execute(ScriptQuery scriptQuery, ExecuteParams executeParams);
EngineExecutorResult execute(ScriptEntry scriptEntry, ExecuteParams executeParams);
EngineExecutorResult execute(String groovyMethodName, ScriptQuery scriptQuery, ExecuteParams executeParams);
EngineExecutorResult execute(String groovyMethodName, ScriptEntry scriptEntry, ExecuteParams executeParams);
```
默认实现 `DefaultEngineExecutor`。

## 变量绑定(关键)

`ExecuteParams extends HashMap<String,Object>`(+ `getValue(key)` 强转)。`DefaultEngineExecutor.buildBinding`(行 144-154)把:
1. Spring `ApplicationContext`(key `applicationContext`);
2. `ExecuteParams` 的**所有键值对**
逐条 `Binding.setProperty` 注入 → **脚本里直接用变量名访问,无需前缀**。

> 所以规则脚本的 `originBody`/`device`/`config`/`log` 等,都是 cloud 端 `ScriptBindingAssembler` 塞进 `ExecuteParams` 的条目;新增绑定变量 = 往 ExecuteParams 加 key。

## 编译 + 缓存

- `DynamicCodeCompiler` / `GroovyCompiler`:`GroovyClassLoader.parseClass()` 动态编译;**每次编译 new 一个 ClassLoader**(让旧 Class 可被 GC)。
- 脚本缓存 `ScriptRegistry` / `DefaultScriptRegistry`:Caffeine(Bean `thinglinksGroovyScriptEngineCache`,默认 600min),按 `ScriptEntry.uniqueKey` 存;DCL 线程安全,未命中经 `ScriptLoader` 懒加载。
- `ScriptEntry{ scriptContext, fingerprint(内容指纹,变更检测), uniqueKey, lastModifiedTime, clazz }`;`ScriptQuery{ uniqueKey }`。

## 安全边界

`GroovyCompiler` 提供三层纵深防御：

1. 编译前拒绝 `@ASTTest`、`@Grab*`、`groovy.grape` 等可在 `parseClass()` 阶段触发动作的源码。
2. 在 `CANONICALIZATION` 阶段遍历 AST，拒绝进程、反射、文件、类加载、脚本引擎及部分 Spring 容器入口；动态方法名和危险方法指针也会拒绝。
3. 注入 `@TimedInterrupt(5)`，限制常规方法与循环中的 CPU 死循环。

这不是运行时强隔离：拒绝列表不能覆盖全部动态分发、阻塞 I/O、异步任务或资源耗尽；新 ClassLoader 只帮助类回收，不隔离应用 classpath。`DefaultEngineExecutor` 仍把真实 `applicationContext` 注入 Binding，因此只执行受控来源的脚本；不可信脚本必须放到受限进程或容器中。

## 结果 / 状态

`EngineExecutorResult{ ExecutionStatus executionStatus, Object context(脚本返回值), Throwable exception, String errorMessage }`(`success(ctx)` / `failed(throwable|msg)` 工厂)。

`ExecutionStatus`:`SUCCESS(200)` / `FAILED(500)` / `PARAM_ERROR(3003)` / `NO_SCRIPT(4004)`。

## 自动配置

`ThinglinksGroovyEngineCoreAutoConfiguration`(enable 开关)→ import `CoreAutoConfiguration` 注册 `DynamicCodeCompiler`、Caffeine `Cache`、`ScriptRegistry`、`EngineExecutor`、`RefreshScriptHelper`;另注册 `AutoRefreshScriptExecutor`、`HotLoadingGroovyScriptAlarm`、`ApplicationContextHelper`。

异常:`GroovyEngineException` / `LoadScriptException` / `RegisterScriptException`。

> 规则脚本"用法"(注入变量、输出契约)见 cloud skill `rule-script.md`;这里是引擎"实现"。
