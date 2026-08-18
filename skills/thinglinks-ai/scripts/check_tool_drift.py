#!/usr/bin/env python3
"""对账:运行中的 MCP 服务暴露了哪些工具,references/orchestration/ 下写了哪些。

两边不一致就是漂移:代码加了工具但没人告诉模型什么时候用它,或者调度层写着
一个已经下线的工具、模型会去调用一个不存在的名字。

    python3 scripts/check_tool_drift.py --url http://127.0.0.1:18760/ai/mcp --token tl_mcp_xxx

不传 --url 时只做静态检查:列出调度层提到的工具名,用于人工核对。
"""
import argparse
import json
import pathlib
import re
import sys
import urllib.request

ORCHESTRATION = pathlib.Path(__file__).resolve().parent.parent / "references" / "orchestration"
TOOL_PATTERN = re.compile(r"`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`")


def documented():
    """调度层出现的工具名 → 它写在哪几篇里。"""
    found = {}
    for path in sorted(ORCHESTRATION.rglob("*.md")):
        label = path.relative_to(ORCHESTRATION).as_posix()
        for name in set(TOOL_PATTERN.findall(path.read_text(encoding="utf-8"))):
            found.setdefault(name, []).append(label)
    return found


def registered(url, token):
    """向服务要一次 tools/list。"""
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}).encode()
    request = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": f"Bearer {token}",
    })
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = response.read().decode()
    # 无状态传输可能以 SSE 帧返回,取最后一段 JSON
    for chunk in reversed(payload.splitlines()):
        chunk = chunk.removeprefix("data:").strip()
        if chunk.startswith("{"):
            return {tool["name"] for tool in json.loads(chunk)["result"]["tools"]}
    raise SystemExit(f"没能从响应里解析出工具清单:{payload[:200]}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="MCP 端点,例如 http://127.0.0.1:18760/ai/mcp")
    parser.add_argument("--token", help="tl_mcp_ 开头的凭证")
    args = parser.parse_args()

    docs = documented()
    if not args.url:
        for name, files in sorted(docs.items()):
            print(f"{name:34} {', '.join(files)}")
        print(f"\n共 {len(docs)} 个工具名写在 orchestration/ 下。传 --url 与 --token 可与服务对账。")
        return 0

    if not args.token:
        raise SystemExit("--url 需要配合 --token")
    live = registered(args.url, args.token)

    missing = sorted(live - docs.keys())
    stale = sorted(docs.keys() - live)
    for name in missing:
        print(f"[缺文档] {name} 已注册,但调度层没有任何一篇说明什么时候用它")
    for name in stale:
        print(f"[已过时] {name} 写在 {', '.join(docs[name])},但服务未注册")
    if not missing and not stale:
        print(f"一致:{len(live)} 个工具两边都对得上。")
    return 1 if (missing or stale) else 0


if __name__ == "__main__":
    sys.exit(main())
