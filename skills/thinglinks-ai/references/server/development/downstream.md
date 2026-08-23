# 下游契约

## 端点落在 MCP 专用 controller 上

取数走 `/inner/mcp/<域>`:`/inner/mcp/device`、`/inner/mcp/product`、`/inner/mcp/rule`、`/inner/mcp/view`。

不要挂到 `/inner/deviceOpen` 这类既有 controller 上:那组带 `ByNorthbound` 后缀的端点是 openapi 的
北向接口,出参形状被外部集成方钉住,MCP 想加字段就得跟他们协调。
反过来 **MCP 专用端点不加 `ByNorthbound` 后缀**,那个后缀只留给 openapi 依赖的接口。

## 产物命名

下游为 MCP 新增的产物统一命名 `XxxMcpResultVO` + `XxxMcpConverter`。

它们和控制台 VO 混在同一个包里,**名字必须自己会说话** —— 在那里加一个字段等于直接把数据发给模型,
而做这个改动的人多半不知道这个类被 MCP 用着。

## 数据权限要显式开

`DataScopeHelper.startDataScope("<表名>")` 在 inner controller 里显式调用,**一次只对一张主表生效**,
跨两张表的查询要分别开。

**开不开看查的是谁的数据:**

| 端点返回什么 | 开不开 |
| --- | --- |
| 全企业哪些人有某权限、全企业谁改过什么 —— **别人的数据** | 开 |
| 按服务端注入的身份查本人 —— `findSelf` / `findSelfHistory` 这类 | 不开,数据范围对「看自己」不适用 |

**主表取「人/记录从哪张表出」,不是「按哪张表筛」。**权限反查的条件来自角色关系,
但人从员工表出,主表就取员工表。选错表等于没开,而且不会报错。

**走缓存的链路上它无效**:没有 MyBatis 查询可供拼 where 条件(设备详情、影子这类读 Redis 缓存的路径)。
这种链路要靠前置的设备详情查询兜住组织级收窄 —— 这也是「查影子/时序前先查一次设备详情」
这条串联规则的来由。

## Facade 依赖要 cloud-impl

biz 只需要接口,所以少了 `cloud-impl` **编译全过**,server 启动才炸。
抄一份 facade 装配测试守住,别靠编译。

## 字典字段要回显

不回显的话模型只拿到编码 `0` / `1`。controller 与 boot-impl 两条路径都要处理,
MCP 出参刻意不实现回显 VO 接口,采用就地替换。
