# 系统基础架构 + 部署双实现

ThingLinks 云端是多模块单仓,**系统基础**(网关/认证/系统/基础业务)与 **IoT**、**视频**并列。共享基建(租户上下文、DB 插件、Sa-Token 基类)在外部依赖 `thinglinks-util`(`com.mqttsnet.basic.*`,见 `thinglinks-util` skill),不在本仓。

## 系统基础模块

| 模块 | 职责 |
| --- | --- |
| `thinglinks-gateway`(server/biz) | 响应式 WebFlux 网关:认证、路由、限流、CORS、灰度(见 `gateway.md`) |
| `thinglinks-sop-gateway-server` | 独立**开放平台**网关(Gitee SOP,ISV 签名,`/sopgateway`) |
| `thinglinks-oauth` | 登录/登出/令牌/验证码/注册、租户-组织切换(Sa-Token,见 `auth.md`) |
| `thinglinks-system` | **平台级 `Def*` 实体**:租户、用户、客户端、应用/资源(菜单+API)、字典、区域、登录日志、数据源配置 |
| `thinglinks-base` | **租户级 `Base*` 业务**:组织/部门、员工、岗位、角色+资源关系、字典、参数、文件、消息/通知/模板、操作日志 |
| `thinglinks-public/thinglinks-common(-config)` | 共享属性/常量/缓存 key、`IgnoreProperties`(鉴权放行表)、Mybatis 租户/数据权限拦截器、动态数据源自动配置 |
| `thinglinks-support`(monitor / base-executor) | Spring Boot Admin 监控;XXL-Job 执行器(base/system 定时任务;IoT 用 iot-executor) |

> `Def*`(system,全局身份)vs `Base*`(base,租户内投影)的关系见 `multi-tenant.md`。

## 部署双实现(boot vs cloud)—— 与 IoT 下行 Facade 同一范式

base/oauth/system 的 `-facade` 各拆 3 个 Maven 子模块:
- **`-api`**:纯接口(如 `DefUserFacade extends LoadService`)。
- **`-boot-impl`**:单体部署 —— impl 直接调本地 `@Service`(进程内)。
- **`-cloud-impl`**:微服务部署 —— impl 委托 **`*Api` 客户端** + fallback。
  客户端技术按发行分叉(旗舰 Spring HTTP Interface / 社区 OpenFeign),写法见 `service-rpc.md`。

两个 impl **注册同一个 Spring bean 名**(如 `@Service(EchoApi.DEF_USER_ID_CLASS)`),调用方与部署无关,每种部署只打包其中一个 impl jar。例 `DefUserFacade.findAllUserId()`:boot 直调 `defUserService`,cloud 调 `defUserApi`(**`@Autowired @Lazy` 注入,否则 gateway 启不来** —— 这条两条版本线都成立)。网关 server 依赖 `*-cloud-impl`,故网关总是通过 HTTP 访问 base/system。

> 与设备下行 `DeviceDownlinkFacade`(见 `../iot/downlink-command.md`)是**同一套 Facade 双实现机制**。

## ⚠️ 反幻觉

- 共享基建在外部 `thinglinks-util`(`com.mqttsnet.basic.*`),不在本仓 —— 找租户上下文/DB 拦截器去那边。
- 一接口两实现、同 bean 名,按部署只上一个;别假设只有一个实现类。
- 类名/行号随版本演进,核对真实代码。
