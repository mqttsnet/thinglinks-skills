# 协议编解码(protocol-starter)

包 `com.mqttsnet.basic.protocol`。信封**结构**见 cloud skill `protocol-envelope.md`;这里是**实现**。

## ProtocolMessageAdapter(`factory`,@Component 主入口)

| 方法 | 作用 |
| --- | --- |
| `boolean validateProtocolData(String body)` | 校验:含 head/dataSign,mid/timeStamp>0,cipherFlag∈[0,2] |
| `Map<String,String> extractVariables(String topic)` | 从 topic 取 version + deviceId(正则 `/([^/]+)/devices/([^/]+)`) |
| `ProtocolDataMessageDTO parseProtocolDataMessage(String body)` | JSON 串 → DTO |
| `String decryptMessage(String body, EncryptionDetailsDTO)` | 按 cipherFlag 解密 → 明文 dataBody |
| `<T> ProtocolDataMessageDTO<T> buildResponse(ProtocolDataMessageDTO<T> src, String resultDataBody, EncryptionDetailsDTO)` | 构建响应(沿用源 mid) |
| `<T> ProtocolDataMessageDTO<T> buildResponse(String resultDataBody, EncryptionDetailsDTO)` | 构建响应(从 EncryptionDetailsDTO.mId 生成) |

> 下行 `buildResponse` 入参是**单次序列化**的 dataBody JSON 串;明文时内部 readValue 还原成对象塞 dataBody(见 cloud `downlink-command.md`)。

## ProtocolMessageSignatureVerifierUtils(`utils`,静态)

| 方法 | 行 | 作用 |
| --- | --- | --- |
| `encryptMessage(String dataBody, Long mid, Integer cipherFlag, String signKey, String encryptKey, String encryptVector)` | 43 | 加密 dataBody → 算 dataSign → 拼信封 JSON |
| `decryptMessage(String messageJson, String signKey, String encryptKey, String encryptVector)` | 77 | 验签 → 按 cipherFlag 解密 → 返回明文 dataBody |
| `generateDataSign(long timeStamp, String signKey)` | 213 | `SHA256(timeStamp + ":" + signKey)` |
| `validateProtocolData(String json)` | 224 | 结构/字段范围校验 |

**cipherFlag 处理**:

| flag | dataBody | 加解密 |
| --- | --- | --- |
| 0 明文 | 原样 | 不处理 |
| 1 SM4 | 密文(HEX) | `Sm4Utils.encryptWithCustom/decryptWithCustom(data, encryptKey, encryptVector)` |
| 2 AES | 密文(HEX) | `AesUtils.encryptWithCustom/decryptWithCustom(...)` |

私有桥接:`sm4Encrypt`:142 / `sm4Decrypt`:157 / `aesEncrypt`:172 / `aesDecrypt`:187。

## DTO(`model`)

- `ProtocolDataMessageDTO<T>{ Head head, T dataBody, String dataSign }`;`Head{ Integer cipherFlag, Long mid, Long timeStamp }`。
- `EncryptionDetailsDTO{ String signKey, String encryptKey, String encryptVector, Integer cipherFlag, Long mId }`(mId 可由 SnowflakeIdUtil 初始化)。

## 加解密底座(thinglinks-core)

- `Sm4Utils`(`utils/sm`)/ `AesUtils`(`utils/aes`):`encryptWithCustom(plain, key, iv)` → HEX、`decryptWithCustom`;均为 **CBC + PKCS5Padding**。SM4 key/IV 为 16 字节;AES key 为 16/24/32 字节、IV 固定 16 字节。`*WithDefaults` 从 `EncryptKeyManager`(`secure/config`)取配置。
- AES 输入、配置或运算失败会抛异常;SM4 helper 当前失败返回空字符串,协议入口必须拒绝空的加密/解密结果。
- `Sm4Utils` 默认构造路径当前读取的是 `EncryptKeyManager.Algorithm.AES`;依赖 `*WithDefaults` 前先核对或修正配置选择。协议 codec 的 custom key/IV 路径不经过该默认配置。
- `ProtocolRegexTopicVariableExtractorUtils.extractVariables(input)`(`utils`):正则取 version + deviceId。

依赖:protocol-starter → core(Sm4/Aes/SnowflakeId/EncryptKeyManager)+ Hutool + fastjson2 + Jackson + commons-codec。
