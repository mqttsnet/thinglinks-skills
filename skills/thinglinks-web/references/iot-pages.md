# IoT 页面地图(`src/views/iot`)

api 在 `src/api/iot/` 同构,i18n 在 `locales/lang/*/iot/`。

## link(设备链路,核心)

```
views/iot/link/
├── product/                 产品:列表/详情/编辑/版本/发布
├── device/                  设备:列表/详情/调试/命令执行;`running/` 运行状态(**设备影子**展示,api 在 `api/iot/link/deviceShadow`)
├── group/                   设备分组
├── productCommand/ productProperty/ productService/   物模型:命令/属性/服务定义
├── productCommandRequest/ productCommandResponse/     命令请求/响应记录
├── productTopic/            产品 Topic(基础/自定义)
├── productVersion/ productVersionChangeLog/ productPublishRecord/   版本/变更日志/发布记录
├── ota/                     OTA 升级(任务/记录)
├── deviceLocation/              设备定位
├── dashboard/                   资产看板:assetStats(资产统计)/ assetmap(资产地图,2D/3D)
├── product/versionOverview/     产品版本总览
└── operationMaintenance/
    ├── debug/               设备调试:webSocket/ + mqtt/
    ├── accessControl/       ACL:deviceAclRule(Edit/detail/data.tsx)
    └── cacert/              CA 证书:SSL 测试器 / 证书授权
```

## rule(规则引擎)

```
views/iot/rule/
├── engine/                  规则策略引擎
├── alarm/                   告警(规则/记录/渠道)
├── groovy/ruleGroovyScript/ Groovy 规则脚本(index/detail/Edit/data.tsx)← 见 rule-script-debug.md
├── plugin/                  插件(信息/实例)
└── integration/             北向集成(数据源/桥接/MQTT 订阅源/协议转码)+ dashboard/
```

## mqs

```
views/iot/mqs/bus/           消息总线统计
```

> 加页面流程见 `routing-permission.md`;组件见 `ui-components.md`。
