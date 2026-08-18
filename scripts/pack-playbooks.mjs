#!/usr/bin/env node
/**
 * 把 thinglinks-ai 的手册打成一份可直接粘贴到 Nacos 的纯文本。
 *
 * 用法:
 *   node scripts/pack-playbooks.mjs                       # 打 workflows,输出到 stdout
 *   node scripts/pack-playbooks.mjs --out <file>          # 同时写文件(给构建当兜底副本)
 *   node scripts/pack-playbooks.mjs --include orchestration --include boundaries
 *
 * 产物形态:
 *   === origin: <commit> <生成时间> ===
 *   === path: workflows/iot/device-offline.md ===
 *   <原文,含 front matter>
 *
 * 不访问 Nacos,不需要任何凭据。推送由人在 Nacos 后台完成。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REFERENCES = join(ROOT, 'skills', 'thinglinks-ai', 'references');
const PATH_MARKER = '=== path: ';
const ORIGIN_MARKER = '=== origin: ';
/** 上限留在 80KB:Nacos 单配置 100KB,余下的给一次意外的大改动 */
const MAX_BYTES = 80 * 1024;

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const out = outIndex >= 0 ? args[outIndex + 1] : null;
const includes = args.reduce((acc, a, i) => (a === '--include' ? [...acc, args[i + 1]] : acc), []);
const prefixes = includes.length ? includes : ['workflows'];

const walk = (dir) =>
  readdirSync(dir)
    .sort()
    .flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.md') ? [full] : [];
    });

const origin = (() => {
  let commit = 'unknown';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
    if (dirty) commit += '-dirty';
  } catch {
    // 不在 git 工作区里也要能打包,来源标记退化成 unknown
  }
  return `${commit} ${new Date().toISOString()}`;
})();

const parts = [`${ORIGIN_MARKER}${origin} ===`];
let count = 0;

for (const prefix of prefixes) {
  const base = join(REFERENCES, prefix);
  for (const file of walk(base)) {
    const rel = relative(REFERENCES, file).split('\\').join('/');
    const content = readFileSync(file, 'utf8');
    // 正文里出现分隔标记会把一篇劈成两篇,且劈开的那半没有 front matter——
    // 在这里挡住,比在服务端解析时报一句看不懂的错好
    for (const marker of [PATH_MARKER, ORIGIN_MARKER]) {
      if (content.includes(marker)) {
        console.error(`✗ ${rel} 正文里出现了分隔标记 ${marker.trim()},请改写该行`);
        process.exit(1);
      }
    }
    parts.push(`${PATH_MARKER}${rel} ===`, content.trimEnd(), '');
    count++;
  }
}

const payload = parts.join('\n');
const bytes = Buffer.byteLength(payload, 'utf8');

if (bytes > MAX_BYTES) {
  console.error(
    `✗ 打包后 ${bytes} 字节,超过 ${MAX_BYTES}(Nacos 单配置上限 100KB)。请拆成多份并在服务端 data-ids 里各列一条`
  );
  process.exit(1);
}

if (out) {
  writeFileSync(out, payload, 'utf8');
  console.error(`✓ 已写入 ${out}`);
}
console.error(`✓ ${count} 篇 / ${bytes} 字节 / origin ${origin}`);
if (!out) process.stdout.write(payload);
