# 安全基线(硬性指标)

跨工程红线检查表:写码/评审/发版前逐条核。每条都是 **MUST / 禁止**,违反即阻断,不是建议。

## 1. 凭证与密钥

- [ ] **禁止**硬编码口令/密钥/token 进源码与配置模板;模板一律中性占位符(`your-mysql-password` 风格,见 SKILL 第 5 节)
- [ ] **禁止**提交本地环境文件:cloud `src/main/filters/config-dev.properties`、web `.env.development`
- [ ] 真实凭证进过 git 历史 = 已泄露,**必须轮换**;删文件/改库存救不了历史
- [ ] 设备密钥、SIP 认证密码等敏感字段**加密落库**(如 AES),禁止明文存储

## 2. 多租户隔离(平台最高红线)

- [ ] 数据访问必须带租户上下文(DATASOURCE_COLUMN 动态库 + `created_org_id` 租户列),新表必须含租户列
- [ ] 动态数据源必须 `strict: true`:目标库不存在即报错,**禁止静默回落 primary**——跨租户串库是最高严重级缺陷
- [ ] clientId / deviceIdentification 解析租户必须取**真实租户**,禁止硬编码 `@1` / 默认租户兜底

## 3. 鉴权与越权

- [ ] 对外端点默认过网关 Sa-Token 鉴权;放行白名单必须显式声明并经评审
- [ ] 设备 connect / publish / subscribe 必过 BifroMQ ACL;ACL 校验异常一律 **DENY(fail-closed)**,禁止 fail-open
- [ ] 权限以**后端校验为准**;前端 `v-hasPermission` 只是体验层,不得作为唯一关卡
- [ ] AnyUser / AnyTenant / Open 类端点是高危面:新增必须说明暴露原因与限流/校验手段

## 4. 注入与输入校验

- [ ] SQL 一律 MyBatis 参数绑定,**禁止字符串拼接**;生产保持 wall filter 与 `isBlockAttack` 开启
- [ ] 上行 topic / payload / 设备标识入库或路由前校验合法性;非法与乱码 topic **安全拒绝**,不放行不崩溃
- [ ] Groovy 规则脚本只可来自可信配置面(控制台/北向),执行必须有超时与资源边界;禁止执行外部来源脚本

## 5. 传输与存储加密

- [ ] 协议报文按 `cipherFlag` 走 SM4/AES 加解密 + SHA256 `dataSign` 验签;**验签失败拒绝处理**,不降级
- [ ] 生产对外流量 TLS;MySQL / Redis / TDengine / MQTT 端口**不裸暴露公网**(内网或防火墙白名单)

## 6. 日志与信息泄露

- [ ] **禁止**日志输出口令、token、含凭证的完整 URL(TAOS URL 内嵌密码是典型反例);异常日志只打必要上下文
- [ ] 高 TPS 链路(上行/事件/发送回调)的成功日志降 `debug`,防日志洪峰
- [ ] 对外错误响应统一错误码,**不回传堆栈**、SQL、内部路径

## 7. 运维面加固

- [ ] 生产 `p6spy: false`
- [ ] Druid 监控页:强口令 + IP 白名单 + `reset-enable: false`;Actuator 端点必须鉴权,管理端口不对公网开放
- [ ] 连接池 `removeAbandoned` 只是泄漏**兜底**,出现 abandon 日志必须修代码根因(借连接未归还)
- [ ] OTA 升级包必须带签名校验字段(`sign_method`:MD5/SHA256),下发前校验完整性

---

> 使用方式:改动涉及哪组就核哪组;评审/发版前全表过一遍。各机制的实现细节见对应工程 skill(`thinglinks-cloud` / `bifromq-plugin` / `thinglinks-util` / `thinglinks-web`)。
