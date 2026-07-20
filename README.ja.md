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
| [`thinglinks-cloud`](./skills/thinglinks-cloud/) | クラウド基盤 — **システム基盤** / **IoT** / **動画** | **3 ドメイン。** *IoT:* ルールスクリプト、プロトコル封筒、TopicHandler、下り、物モデル、TDengine+シャドウ、ACL、WS ブロードキャスト。*システム:* WebFlux、Sa-Token、内部 API、DATASOURCE_COLUMN、製品マニフェスト/MQ 名前空間、Nacos/Seata デプロイ。*動画:* GB28181(ZLMediaKit)。 |
| [`thinglinks-util`](./skills/thinglinks-util/) | フレームワーク基盤 — プロトコル / スクリプト / キャッシュ / メッセージング / core | プロトコルコーデック、Groovy の実行と安全境界、typed cache-aside とロック、Kafka/RocketMQ、ブリッジ SPI、機密フィールド暗号化、core ユーティリティ、ビルド/リリース規則。 |
| [`thinglinks-web`](./skills/thinglinks-web/) | フロントコンソール — Vue3 + Vben | IoT ページ、defHttp API、ルーティング/権限、共有コンポーネント、ルール通知、製品マニフェスト/ビルドゲート、ブラウザ設定の安全性、i18n と規約。 |
| [`bifromq-plugin`](./skills/bifromq-plugin/) | BifroMQ ブローカープラグイン — `bifromq-plugin-pro` | 認証/ACL、Kafka イベント契約、setting/スロットリングの実装境界、実行時設定とログ安全性、互換バージョン、パッケージング、デプロイ。 |
| [`thinglinks-workspace`](./skills/thinglinks-workspace/) | ワークスペース構成 — Community monorepo ↔ Enterprise 各リポジトリ | **リポジトリ/パス特定。** リポジトリ対応表、ガバナンスファイル配置、独立**バージョンライン** + `bump-version.sh`、`changelogs/` 方式、Nacos テンプレートの**プレースホルダ規則**、コミット禁止ファイル、コミット規約、**セキュリティベースライン**(必須チェックリスト)。 |

## 🚀 インストール

[Skills CLI](https://skills.sh/) 経由で、必要な skill だけを:

```bash
# グローバル(-g);-g を外すと現在のプロジェクトのみ
npx skills add mqttsnet/thinglinks-skills@thinglinks-cloud -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-util  -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-web   -g
npx skills add mqttsnet/thinglinks-skills@bifromq-plugin   -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-workspace -g
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
