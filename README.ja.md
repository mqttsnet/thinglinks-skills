<div align="center">

# ThingLinks Skills

**[ThingLinks](https://github.com/mqttsnet/thinglinks) IoT プラットフォーム開発のための Agent Skills。**

あらゆる AI エージェント(Claude Code · Codex · Cursor)を ThingLinks エキスパートに変える、構造化・オンデマンドのナレッジパック。

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-4-brightgreen.svg)](#-skills)
[![Powered by skills.sh](https://img.shields.io/badge/powered%20by-skills.sh-7c3aed.svg)](https://skills.sh/)
[![ThingLinks](https://img.shields.io/badge/platform-ThingLinks-0960bd.svg)](https://github.com/mqttsnet/thinglinks)

[English](./README.md) · [简体中文](./README.zh-CN.md) · **日本語** · [한국어](./README.ko.md)

</div>

---

## ✨ Agent Skills とは

Agent Skills は、特定ドメインの **深いオンデマンドコンテキスト** を AI エージェントに与える構造化ナレッジパックです。各 skill は小さな `SKILL.md` インデックス + 集中した `references/*.md`(段階的開示)+ コピペ用 `assets/` で構成されます。エージェントは現在のタスクに必要な分だけを読み込むため、コンテキストは軽いまま、回答は推測ではなく **実コード** に基づきます。

本リポジトリは **[ThingLinks](https://github.com/mqttsnet/thinglinks)** IoT プラットフォーム(Java パッケージ `com.mqttsnet.thinglinks`)の公式 skill を集約します。**skill 名はプラットフォームのリポジトリと 1:1 対応** —— どのコードベースを扱う skill か一目で分かります。

## 📦 Skills

| Skill | リポジトリ | できること |
| --- | --- | --- |
| [`thinglinks-cloud`](./skills/thinglinks-cloud/) | クラウド基盤 — **システム基盤** / **IoT** / **動画** | **3 ドメイン。** *IoT:* ルールスクリプト、プロトコル封筒、TopicHandler、下り(`DeviceDownlinkFacade`)、物モデル、キャッシュ、TDengine+シャドウ、ACL、WS ブロードキャスト。*システム:* WebFlux ゲートウェイ(Sa-Token)、oauth、system/base、boot/cloud Facade、DATASOURCE_COLUMN マルチテナント。*動画:* GB28181(ZLMediaKit)。 |
| [`thinglinks-util`](./skills/thinglinks-util/) | フレームワーク基盤 — `protocol-starter` / `groovy-engine-starter` / `thinglinks-core` | プロトコル **コーデック**(SM4/AES/SHA256 署名)、**Groovy エンジン**、**コアユーティリティ**(SnowflakeId、LampJackson `Long→String`、MqttTopicMatcher、HLC、暗号)。 |
| [`thinglinks-web`](./skills/thinglinks-web/) | フロントコンソール — Vue3 + Vben | IoT **ページ**、**API 層**(defHttp)、**ルーティング + 権限**、Vben + IoT **コンポーネント**、ルールスクリプト **デバッグパネル**、**規約**(ファイル配置 / Flexy デザイン)、**i18n**。 |
| [`bifromq-plugin`](./skills/bifromq-plugin/) | BifroMQ ブローカープラグイン — `bifromq-plugin-pro` | BifroMQ **認証 + ACL**(`IAuthProvider`)、**イベントコレクター**(`IEventCollector` → Kafka)、**setting** & **resource-throttler**、`EventTypeEnum ↔ DeviceActionTypeEnum` マッピング、プラグイン **デプロイ**。 |

## 🚀 インストール

[Skills CLI](https://skills.sh/) 経由で、必要な skill だけを:

```bash
# グローバル(-g);-g を外すと現在のプロジェクトのみ
npx skills add mqttsnet/thinglinks-skills@thinglinks-cloud -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-util  -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-web   -g
npx skills add mqttsnet/thinglinks-skills@bifromq-plugin   -g
```

インストール後、関連する話題(ThingLinks、規則脚本、設備上行/下行、物モデル、デバイスシャドウ、BifroMQ auth/ACL、`mqs` / `rule` / `link` / `broker` モジュール等)に触れると skill が **自動起動** します。

## 🧱 skill の構成

```
<skill>/
├── SKILL.md           # インデックス:アーキ概要 + References Index + 反ハルシネーション
├── references/*.md    # サブトピックごとの集中ドキュメント(オンデマンド読込)
├── assets/            # コピペ用スターター(必要な場合)
└── agents/openai.yaml # クロスツールインターフェース(Codex / OpenAI agents)
```

## 🤝 コントリビュート

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照。原則:**実コードに基づく** · **1 skill = 1 リポジトリ** · `SKILL.md` を肥大化させず references に分割 · `description:` は具体的に。PR 前に `node scripts/validate.mjs` を実行してください。

## 📄 ライセンス

[Apache-2.0](./LICENSE) © [mqttsnet](https://github.com/mqttsnet)
