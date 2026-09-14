#!/usr/bin/env python3
"""校验 evals/evals.json 并打印覆盖矩阵。

用例烂掉的方式是静默的:改了篇目名而用例的 covers 还指着旧路径,
或者两条用例重名导致执行器只跑了后一条。这两种都不会报错,只会让
「20 篇全覆盖」这句话慢慢变成假话。所以自检放在这里,不靠人记得核对。

用法: python3 scripts/check_evals.py   (在 skills/thinglinks-ai 下执行)
退出码非 0 表示有问题。
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# orchestration 目前整组没有用例,原因写在 evals/README.md,这里不计入缺口
COVERAGE_SCOPE = ("boundaries/", "workflows/")


def main() -> int:
    with open(os.path.join(ROOT, "evals/evals.json"), encoding="utf-8") as fp:
        evals = json.load(fp)["evals"]

    problems = []

    ids = [e["id"] for e in evals]
    if ids != list(range(1, len(evals) + 1)):
        problems.append(f"id 必须从 1 连续编号,实际为 {ids}")

    names = [e["name"] for e in evals]
    duplicated = {n for n in names if names.count(n) > 1}
    if duplicated:
        problems.append(f"name 重复: {sorted(duplicated)}")

    covers = {}
    for e in evals:
        target = e.get("covers")
        if not target:
            problems.append(f"#{e['id']} {e['name']} 缺 covers")
            continue
        if not os.path.exists(os.path.join(ROOT, "references", target + ".md")):
            problems.append(f"#{e['id']} {e['name']} 的 covers 指向不存在的篇目: {target}")
        covers.setdefault(target, []).append(e["id"])
        if not e.get("assertions"):
            problems.append(f"#{e['id']} {e['name']} 没有断言")

    docs = sorted(
        path[len(ROOT) + len("/references/"):-len(".md")]
        for path in glob.glob(os.path.join(ROOT, "references/**/*.md"), recursive=True)
    )
    in_scope = [d for d in docs if d.startswith(COVERAGE_SCOPE)]

    print(f"用例 {len(evals)} 条,断言 {sum(len(e['assertions']) for e in evals)} 项\n")
    uncovered = []
    for doc in in_scope:
        hit = covers.get(doc)
        print(f"  {'[x]' if hit else '[ ]'} {doc:42s} {'#' + ','.join(map(str, hit)) if hit else ''}")
        if not hit:
            uncovered.append(doc)
    if uncovered:
        problems.append(f"{len(uncovered)} 篇没有用例守护: {uncovered}")

    stray = sorted(set(covers) - set(in_scope))
    if stray:
        print(f"\n覆盖范围之外的用例(不计入缺口): {stray}")

    if problems:
        print("\n不通过:")
        for p in problems:
            print(f"  - {p}")
        return 1
    print(f"\n通过:{len(in_scope)} 篇全部有用例守护")
    return 0


if __name__ == "__main__":
    sys.exit(main())
