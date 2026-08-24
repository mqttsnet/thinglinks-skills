# 服务间调用(HTTP Interface / Feign 按发行分叉)

> **先确认你在哪条版本线上再动手。**两条线的服务间调用方式已经不一样了,
> 照着另一条线写出来的代码编译不过,或者编译过了但启动时找不到 bean。
> 判定方法:仓库根 `.thinglinks-product.env` 的 `THINGLINKS_EDITION_CODE`
> (`enterprise` / `community`),或直接 grep 一下 `@HttpExchange`。

| | 社区版(monorepo `thinglinks/thinglinks-cloud`) | 旗舰版(`thinglinks-cloud-pro-*`) |
| --- | --- | --- |
| 客户端接口 | `@FeignClient` + `@PostMapping` | `@HttpExchange` + `@PostExchange` |
| 服务名写在哪 | 接口注解的 `name=` 上 | **不在接口上**,在 `@ImportHttpServices(group=…)` |
| 降级 | 注解的 `fallback=`,类放 `api.hystrix` | `@HttpServiceFallback`,类放 `api.fallback` |
| 底层 | OpenFeign + Sentinel 适配 | `RestClient` + Spring Cloud CircuitBreaker |

两边**不变**的部分:`/inner/**` 治理、header 透传语义、boot/cloud 双实现、`@Lazy` 注入约束、
`R` 信封与 `R.timeout()` 语义。所以下面只讲客户端写法,其余仍看
`../security/internal-api-governance.md` 与 `architecture.md`。

---

## 旗舰版:HTTP Interface 三件套

一个下游调用要三样东西齐了才能跑起来,少任何一样的症状都不是编译错误。

### 1. 接口 —— 只声明路径,不声明目标

```java
@HttpExchange("/inner/deviceDownlinkOpen")
public interface DeviceDownlinkApi {

    @Operation(summary = "设备下行派发")
    @PostExchange(url = "/dispatch", contentType = MediaType.APPLICATION_JSON_VALUE)
    R<?> dispatch(@RequestBody DownlinkCommand command);
}
```

- `@HttpExchange` 的值就是老 `@FeignClient(path=…)`,**必须与下游 controller 的 `@RequestMapping` 成对**。
  也有接口写成裸 `@HttpExchange`、把完整路径放在方法上(如 `DefUserApi`),两种都合法 ——
  照抄之前先看清这个接口把前缀放在哪一层,别把路径拼重
- 方法上是 `@GetExchange` / `@PostExchange`,不是 `@GetMapping` / `@PostMapping`;
  请求体仍用 `@RequestBody`,`contentType` 写在 `@PostExchange` 上而不是 `consumes`
- **接口上没有服务名、没有 fallback**。照 Feign 的习惯往这里加 `name=` 会直接编译不过

### 2. 注册类 —— 在这里绑服务名与降级

放 `<模块>-cloud-impl` 的 `com.mqttsnet.thinglinks.http` 包,**一个 facade 实现模块一个类**
(可以在里面注册多个 group),命名 `<服务>ServerHttpServiceConfiguration`:

```java
@Configuration(proxyBeanMethods = false)
@ImportHttpServices(
        group = "thinglinks-view-server",
        types = ViewProjectMcpApi.class)
@HttpServiceFallback(group = "thinglinks-view-server",
        service = ViewProjectMcpApi.class, value = ViewProjectMcpApiFallback.class)
public class ViewServerHttpServiceConfiguration {
}
```

- **`group` 就是 Nacos 服务名**,按服务发现负载均衡。一个类里可以写多个 `@ImportHttpServices`
  指向不同 group —— `LoginUserHttpServiceConfiguration` 同时接 base / oauth / system 三个,
  `BrokerServerHttpServiceConfiguration` 同时接 `thinglinks-broker-server` 与外部的 `bifromq-api`
- `types` 是数组,同一 group 的接口都列进去
- `@HttpServiceFallback` **一个接口一条**,不能合并
- 导入包是 `org.springframework.web.service.registry.ImportHttpServices` 与
  `org.springframework.cloud.client.circuitbreaker.httpservice.HttpServiceFallback`

### 3. Fallback —— 必须有,而且必须返回 `R.timeout()`

```java
public class ViewProjectMcpApiFallback implements ViewProjectMcpApi {
    @Override
    public R<List<ViewProjectMcpResultVO>> listProjects(String name, Integer status, Integer limit) {
        return R.timeout();
    }
}
```

`common.yml` 开了 `spring.cloud.circuitbreaker.http-services.enabled: true`,
**它会包装所有 group** —— 缺 fallback 的接口在调用时抛 `NoFallbackAvailableException`,
不是启动时报错。所以「新增一个 HTTP Interface」这件事的完成标准是三件套齐,不是接口写完。

返回 `R.timeout()` 不是随手挑的:上游靠 `R.TIMEOUT_CODE` 把「下游暂时不可用」与
「确实没有这条数据」分开。返回 `R.fail()` 或 null 会让上游把熔断当成业务空结果,
MCP 那条链路上的表现就是 401 与 503 混在一起(见 `ai-mcp-service.md`)。

## 外部固定地址不走服务发现

BifroMQ 这类不在 Nacos 里的目标,group 名不是服务名,基址在配置里给:

```yaml
spring:
  http:
    serviceclient:
      bifromq-api:
        base-url: ${BIFROMQ_API_SERVER:http://127.0.0.1:18091}
```

对应 `group = "bifromq-api"`。外部 API **两种部署都要调**,所以 boot-impl 与 cloud-impl
各自都注册了这个 group(`BifroMqHttpServiceConfiguration` / `BrokerServerHttpServiceConfiguration`)。

超时是全局的:`spring.http.clients.connect-timeout: 30s` / `read-timeout: 15s`,
底层 `factory: http-components`。

## header 透传由框架层做,业务不用管

`thinglinks-util-pro` 的 `HttpServiceAutoConfiguration` 给所有 group 挂上
`HttpServiceHeaderInterceptor`:同步调用优先透传当前 Servlet 请求头,
没有 Servlet 上下文(异步线程)时回退到 `ContextUtil.getLocalMap()`。

透传的是租户、用户、员工、公司/部门、token、clientId、path、locale、trace、灰度版本、
`X-Real-IP` / `x-forwarded-for` 这一组。它会**过滤空值并写成单值 header**,
所以不会再出现重复 trace 头。

> 常量 `ContextConstants.FEIGN = "x-feign"` 还在,那只是遗留的 header 名。
> 见到它不代表这条链路还在用 Feign。

## `@Lazy` 仍然必须加

facade 的 cloud 实现注入 `*Api` 时要 `@Autowired @Lazy`:

```java
@Autowired
@Lazy  // 一定要延迟加载，否则 thinglinks-gateway-server 无法启动
private DefUserApi defUserApi;
```

网关 server 依赖 `*-cloud-impl`,不延迟加载会在网关启动阶段触发客户端代理构建而起不来。
这条从 Feign 时代延续下来,换成 HTTP Interface 后没有失效。

## 加一个下游调用的自检清单

1. 接口 `@HttpExchange` 路径与下游 controller `@RequestMapping` 是否成对(都带 `/inner`)
2. 方法注解是不是 `*Exchange` 而不是 `*Mapping`
3. `@ImportHttpServices` 的 group 是不是**真实 Nacos 服务名**
4. `@HttpServiceFallback` 补了没有,fallback 返回的是不是 `R.timeout()`
5. facade cloud 实现注入处有没有 `@Lazy`
6. 调用方模块的 pom 依赖了目标服务的 `*-cloud-impl` 没有(只依赖 `-api` 时编译全过、启动才炸)
7. 网关访问 `/xxx/inner/**` 仍被拒绝

## 社区版写法(勿混用)

```java
@FeignClient(name = "${thinglinks.feign.tenant-server:thinglinks-broker-server}",
             fallback = DeviceDownlinkApiFallback.class,
             path = "/inner/deviceDownlinkOpen")
public interface DeviceDownlinkApi {
    @PostMapping(path = "/dispatch", consumes = MediaType.APPLICATION_JSON_VALUE)
    R<?> dispatch(@RequestBody DownlinkCommand command);
}
```

服务名可用配置占位符覆盖,fallback 类在 `api.hystrix` 包,不需要单独的注册配置类。
