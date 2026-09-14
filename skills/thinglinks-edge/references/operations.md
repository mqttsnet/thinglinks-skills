# 部署、实例与维护

## 新部署尽量简单

先确认目标主机、Docker/Compose、CPU/系统架构、现场网络与所选发行。部署版本以实际发布制品及配套 Compose 为准；源码有新服务不代表旧发布镜像含该入口，不能混用工作树 Compose 和未确认的镜像。

已有 Docker 的用户，先给三步：**取得所选发行配套 Compose → 顶部填写访问地址及初始管理员密码 → `docker compose up -d`**。高级变量只在实际场景需要时展开。
当前配套 Compose 首次初始化会准备数据目录、密钥和默认实例镜像；不用让用户手工生成整套配置。已有管理员升级不重置密码，已有密钥不能重新生成。
从发行镜像提取 `/app/docker-compose.yml` 时，先核对该制品含文件，并在空部署目录保存；已有部署先比对文件，避免覆盖配置。

发行入口是项目 [GitHub](https://github.com/mqttsnet/thinglinks-edge) 与 [Docker Hub](https://hub.docker.com/r/mqttsnet/thinglinks-edge)。按所选 tag/digest 的内容核对，不把仓库默认分支当成该版本的配套部署文件，也不把历史 1.0.1 自动称为最新版。
需要命令时，先将 `EDGE_RELEASE_IMAGE` 设为**已核验的完整发行镜像引用**，在空部署目录提取（不要求用户克隆源码）：

```sh
docker run --rm --pull=always --entrypoint cat "$EDGE_RELEASE_IMAGE" /app/docker-compose.yml > docker-compose.yml
```

核对提取成功后填写顶部两项，再 `docker compose up -d`。向用户提供最终可执行命令时替入已确认的版本；查不到发布证据时说明尚未确认版本，不编造 tag。

检查：`docker compose ps -a`、实际管理入口和 `/healthz`；当前包含 Manager、Docker 策略、网络保护三种控制服务，均须对应同一发行镜像。初始化容器 `Exited (0)` 表示完成，不按服务崩溃处理。
amd64/arm64 是主要交付路线，仍核对所选制品 manifest 与协议原生依赖；其他架构不根据“有 Docker”就认定支持，也不把冗长架构历史放进首次操作步骤。

## 实例与节点包

- 实例是独立 Node-RED 容器，有自己的流程、数据和网络。先清点记录与实际容器的对应关系；“容器缺失”不能靠删除数据库记录当修复。
- 使用组件目录的固定版本。open/allowlist 是不同策略；批准、有效策略、安装、加载分别看。节点类型以实例运行状态为证，不以 npm 下载成功为证。
- `ThingLinks Edge Community catalogue` 是浏览器组件发现入口；容器内 npm 下载经 Manager registry/cache。搜索目录可见不代表容器能下载或安装。
- 首批协议离线种子、平台节点包、其他协议原生构件是不同制品。修改批准清单后，已有实例可能需要策略应用及重启才生效；先说明具体实例影响。
- 普通 Node-RED 镜像没有 OPC UA 兼容构件；选用前核对实际镜像清单和可信策略范围，见 [协议](protocols.md)。

## 编辑器和网络

当前实现按实例使用独立编辑器来源/端口与访问授权。主管理入口、实例编辑器和设备 HTTP 入口分开；以页面及部署配置显示的端口为准，不套历史“只开放管理端口就够”的说明。
HTTPS 反代需为实际编辑器端口提供对应 TLS 和 WebSocket 转发。主机名应与 EXTERNAL_URL 一致；localhost、IP、域名之间切换会改变 Cookie 主机。
同一实例内的第三方节点仍共享进程与可写数据，不是每个节点各有沙箱。撤销网页会话也不会撤销已部署的定时控制流程。
实例运行非 root、只读根、禁止提权及受限挂载；网络保护不能用放开 privileged、裸 Docker socket 或宿主目录解决兼容问题。需要设备连通性例外时按已支持配置限定目标，并验证实例到设备的路径。

## 升级的最小维护流程

1. 读取实际 Manager/策略/网络服务镜像、实例镜像、组件版本、流程修订、数据布局及健康状态；确定升级范围。
2. 保留原加密密钥，生成所需一致性级别的备份，保留旧制品与恢复说明。不能承诺换回镜像就能回退数据库或设备动作。
3. 按对应版本说明更新控制服务。更新 Manager 不主动重启既有 Node-RED，但管理连接/上云/状态通路可能短暂不可用，不能承诺整个云边链路零影响。
4. 旧容器隔离配置不符合新门禁时，定位具体差异并安排受支持重建/迁移；不关闭检查强行启动。
5. 新模板需要重新预览/部署；镜像升级不自动修改旧流程。验证管理健康、编辑器、组件加载、真实采集、上云，以及任务涉及的控制/状态恢复。

盘点旧模板时，在“流程模板”查看内置模板版本和“我的模板”的来源/内置副本修订；这只描述库中模板，不能证明实例正在跑同一修订。再在目标实例读取实际流程，核对连接、点位和采集来源。可配置副本选择“按参数重新生成”，而非“使用已保存快照”；无法重配的快照从对应内置模板重建参数。
按设备及其全部采集来源分批迁移，预览后部署并验证。控制流程尤其不能保留新旧两个活跃消费者；必要的停用/替换明确到指定流程，不用全实例替换掩盖冲突。

## 备份与恢复

当前新备份为 `.tle-backup`，认证加密覆盖完整 TAR/清单。恢复必须持有**原密钥**；默认 `<EDGE_DATA_ROOT>/.master.key` 不包含在业务备份中，需单独保管。`--force` 不跳过加密认证；丢失密钥不能靠生成替代密钥恢复。

在管理台“备份”页（`/backup`，按实际 basePath）查看当前包含实例、文件数与密钥指纹，下载备份；需要 `backup:run` 权限。后台 `POST /api/backup` 下载，`POST /api/backup/inspect` 重新生成当前预览，**不是验证此前已下载的归档**。页面没有在线恢复按钮，恢复走离线 CLI。

| 内容 | 当前恢复范围 |
| --- | --- |
| Manager SQLite 与 WAL/SHM | 数据库快照切换及旧 WAL/SHM 处理 |
| instances 目录 | 整体替换；备份没有的旧实例文件也会移除 |
| npm/npm-seed/spool 等 | 不随本次目标整体恢复；不是完整机器镜像 |
| 主密钥、网络控制/策略状态卷 | 不包含在业务备份；另行保管和核对 |

**恢复前停止 Manager、所有目标 Node-RED 实例和其他数据写入者，并确保只有一个恢复进程。** `docker compose stop manager` 不停止兄弟实例。
需要运行中实例跨文件一致性时，先停相关写入者再备份；SQLite 一致快照不能自动证明实例多文件一致。

恢复先认证与路径校验，再私有暂存、持久化事务、切换和清理。`.restore-transaction` 存在会阻止 Manager 开库；中断时保留现场，用对应版本的 `restore --recover` 恢复，不能手删事务目录绕过。
执行前提供确切目标目录、会被替换内容、停机范围和回退条件；用户已明确授权对应范围时继续执行，不重复索要同一批准。

在已清点并停止目标实例/所有写入者后，使用**该部署原来的 Compose 项目、数据根与密钥配置**。`EDGE_BACKUP_FILE` 是已核对且恢复进程可读的备份绝对路径；以下是恢复调用形状，不能未检查目标就直接执行：

```sh
docker compose stop manager
docker compose run --rm --no-deps --volume "$EDGE_BACKUP_FILE:/restore/input.tle-backup:ro" --entrypoint node manager dist/index.js restore /restore/input.tle-backup
```

若已有中断事务，继续保持停机，在同一部署执行：

```sh
docker compose run --rm --no-deps --entrypoint node manager dist/index.js restore --recover
```

`--no-deps` 防止恢复命令自动拉起依赖服务；它不代替停止独立实例。恢复标准布局为 `DATA_DIR=<EDGE_DATA_ROOT>/manager` 和 `INSTANCE_DATA_ROOT=<EDGE_DATA_ROOT>/instances`；挂载、文件系统及权限必须允许原指南要求的暂存/切换。

恢复后核对数据库/实例目录、实际容器和网络归属、端口、密钥、组件、流程与实际采集。恢复旧数据库可能倒退命令去重信息或实例来源记录，需单独核对，不能把物理动作也当成可回滚。
普通升级不使用 `docker compose down -v`，它会移除控制/策略状态卷。清理仅针对已清点、用途确认且在授权范围内的资源，不按名称前缀批量删生产资源。

当前仍需识别的边界：历史 v1 明文归档兼容、全包驻留内存、大备份峰值、实例跨文件一致性、模式/符号链接/空目录保真。使用当前恢复指南核对，不能把历史“73 项测试通过”写成现场恢复保证。

依据：Edge `docker-compose.yml`、`docs/guides/backup-restore.md`、`docs/guides/instance-isolation.md`、`scripts/offline/README.md`、`apps/manager/src/core/archive/`。
