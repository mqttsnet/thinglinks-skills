# 敏感字段加密

适用 `thinglinks-core` 的 `AesUtils`、`EncryptDecryptUtils` 与 MyBatis `EncryptTypeHandler`。

## 存储契约

字段格式为 `ENC@ + Base64(HEX AES 密文)`。AES 使用 CBC + PKCS5Padding；key 为 16/24/32 字节，IV 固定 16 字节。

| 输入 | 行为 |
| --- | --- |
| `null` / 空字符串 | 原样返回 |
| 无 `ENC@` 的读取值 | 作为兼容明文返回 |
| 普通明文写入 | AES 加密后加 `ENC@` |
| 合法且可解的 `ENC@` 再写入 | 原密文写回，不重复加密 |
| 畸形、损坏或异密钥 `ENC@` | 抛错，禁止回退原值或继续入库 |

`isEncrypted()` 只验证外层格式，不证明密文能被当前密钥解开。幂等写入必须实际解密验证。

## JDBC 边界

- `EncryptTypeHandler.setParameter` 将加密失败包装为 `SQLException`，失败时不调用 JDBC 写入。
- `getResult` 将解密失败包装为 `SQLException`，不返回数据库原值。
- 日志只记录参数位置或字段名，不记录明文、密文、key、IV。

## 评审规则

1. `ENC@` 开头后只能成功解密或失败；禁止 `catch` 后返回输入、空串或明文。
2. 默认密钥未初始化、key/IV 非法或运算失败都必须中止调用。
3. 当前只有单套默认密钥，轮换前必须设计迁移或版本化多密钥读取。
4. 当前确定性 CBC 格式用于兼容与等值查询，但没有独立认证标签；需要可靠篡改检测时使用版本化的认证加密格式。
