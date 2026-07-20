<div align="center">

# ThingLinks Skills

**[ThingLinks](https://github.com/mqttsnet/thinglinks) IoT 플랫폼 개발을 위한 Agent Skills.**

모든 AI 에이전트(Claude Code · Codex · Cursor)를 ThingLinks 전문가로 만드는 구조화된 온디맨드 지식 팩.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Skills](https://img.shields.io/badge/skills-4-brightgreen.svg)](#-skills)
[![Powered by skills.sh](https://img.shields.io/badge/powered%20by-skills.sh-7c3aed.svg)](https://skills.sh/)
[![ThingLinks](https://img.shields.io/badge/platform-ThingLinks-0960bd.svg)](https://github.com/mqttsnet/thinglinks)

[English](./README.md) · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md) · **한국어**

</div>

---

## ✨ Agent Skills 란?

Agent Skills 는 특정 도메인에 대한 **깊고 온디맨드한 컨텍스트** 를 AI 에이전트에 제공하는 구조화된 지식 팩입니다. 각 skill 은 작은 `SKILL.md` 인덱스 + 집중된 `references/*.md`(점진적 공개)+ 복사-붙여넣기용 `assets/` 로 구성됩니다. 에이전트는 현재 작업에 필요한 만큼만 로드하므로, 컨텍스트는 가볍게 유지되고 답변은 추측이 아닌 **실제 코드** 에 근거합니다.

이 저장소는 **[ThingLinks](https://github.com/mqttsnet/thinglinks)** IoT 플랫폼(Java 패키지 `com.mqttsnet.thinglinks`)의 공식 skill 을 모읍니다. **skill 이름은 플랫폼 저장소와 1:1 로 매핑** —— 어떤 코드베이스를 다루는 skill 인지 한눈에 알 수 있습니다.

## 📦 Skills

| Skill | 저장소 | 할 수 있는 것 |
| --- | --- | --- |
| [`thinglinks-cloud`](./skills/thinglinks-cloud/) | 클라우드 플랫폼 — **시스템 기반** / **IoT** / **비디오** | **3 도메인.** *IoT:* 룰 스크립트, 프로토콜 엔벨로프, TopicHandler, 다운링크(`DeviceDownlinkFacade`), 사물 모델, 캐시, TDengine+섀도우, ACL, WS 브로드캐스트. *시스템:* WebFlux 게이트웨이(Sa-Token), oauth, system/base, boot/cloud Facade, DATASOURCE_COLUMN 멀티테넌트. *비디오:* GB28181(ZLMediaKit). |
| [`thinglinks-util`](./skills/thinglinks-util/) | 프레임워크 기반 — 프로토콜 / 스크립트 / 캐시 / 메시징 / core | 프로토콜 코덱, Groovy 실행과 보안 경계, typed cache-aside와 잠금, Kafka/RocketMQ, 브리지 SPI, 민감 필드 암호화, core 유틸리티, 빌드/릴리스 규칙. |
| [`thinglinks-web`](./skills/thinglinks-web/) | 프론트 콘솔 — Vue3 + Vben | IoT **페이지**, **API 레이어**(defHttp), **라우팅 + 권한**, Vben + IoT **컴포넌트**, 룰 스크립트 **디버그 패널**, **컨벤션**(파일 배치 / Flexy 디자인), **i18n**. |
| [`bifromq-plugin`](./skills/bifromq-plugin/) | BifroMQ 브로커 플러그인 — `bifromq-plugin-pro` | 인증/ACL, Kafka 이벤트 계약, setting/스로틀링의 실제 경계, 런타임 설정과 로그 보안, 호환 버전, 패키징 및 배포. |
| [`thinglinks-workspace`](./skills/thinglinks-workspace/) | 워크스페이스 구조 — Community monorepo ↔ Enterprise 리포지토리 | **리포지토리/경로 탐색.** 리포지토리 매핑, 거버넌스 파일 배치, 독립 **버전 라인** + `bump-version.sh`, `changelogs/` 방식, Nacos 템플릿 **플레이스홀더 규칙**, 커밋 금지 파일, 커밋 규약, **보안 베이스라인**(필수 체크리스트). |

## 🚀 설치

[Skills CLI](https://skills.sh/) 로 필요한 skill 만:

```bash
# 전역(-g); -g 를 빼면 현재 프로젝트에만
npx skills add mqttsnet/thinglinks-skills@thinglinks-cloud -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-util  -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-web   -g
npx skills add mqttsnet/thinglinks-skills@bifromq-plugin   -g
npx skills add mqttsnet/thinglinks-skills@thinglinks-workspace -g
```

설치 후, 관련 주제(ThingLinks, 규칙 스크립트, 디바이스 업/다운링크, 사물 모델, 디바이스 섀도우, BifroMQ auth/ACL, `mqs` / `rule` / `link` / `broker` 모듈 등)를 언급하면 skill 이 **자동 트리거** 됩니다.

## 🧱 skill 구성

```
<skill>/
├── SKILL.md           # 인덱스: 아키텍처 개요 + References Index + 반환각(anti-hallucination)
├── references/*.md    # 서브토픽별 집중 문서(온디맨드 로드)
├── assets/            # 복붙용 스타터(필요 시)
└── agents/openai.yaml # 크로스툴 인터페이스(Codex / OpenAI agents)
```

## 🤝 기여

[CONTRIBUTING.md](./CONTRIBUTING.md) 참고. 원칙: **실제 코드 기반** · **1 skill = 1 저장소** · `SKILL.md` 비대화 금지(references 로 분리) · `description:` 은 구체적으로. PR 전에 `node scripts/validate.mjs` 실행.

## 📄 라이선스

[Apache-2.0](./LICENSE) © [mqttsnet](https://github.com/mqttsnet)
