# 构建与发行边界

公共 Maven 身份为 `com.mqttsnet.basic:thinglinks-util`。检出目录名和产品后缀不得写入 Maven 坐标或 Java 包名。

## 产品配置

根目录 `.thinglinks-product.env` 是组件版本与发行元数据的校验来源，但不得存放密码、令牌或仓库凭据。

| 操作 | 命令 | 作用 |
| --- | --- | --- |
| 只读检查 | `scripts/product-config.sh check` | 校验清单、Parent/BOM 版本与受管边界 |
| 修改版本 | `scripts/product-config.sh set-version <version>` | 原子更新清单、Parent 与 BOM |
| 重新渲染 | `scripts/product-config.sh render` | 按当前清单刷新 Parent/BOM 版本 |

不要分别手改 Parent/BOM 的 `revision`。`render` 只刷新脚本实际管理的字段，不是任意产品配置的全文生成器。

## 构建验证

从根聚合工程执行：

```bash
scripts/tests/product-config-test.sh
scripts/product-config.sh check
mvn --batch-mode -DskipTests clean install
git diff --check
git status --short
```

根 POM 在 `validate` 阶段自动执行产品配置检查。`install` 只把工件放入本地 Maven 仓；下游仓库还需更新依赖版本并重新构建。

## 发布边界

- release profile 必须显式启用；普通 `install/package` 不代表已发布。
- 签名口令与仓库凭据只从外部环境或 Maven settings 注入。
- 未得到明确发布授权时，只做配置检查、构建和本地安装，不执行 `deploy`。
