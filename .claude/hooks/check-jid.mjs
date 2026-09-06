#!/usr/bin/env node
// .claude/hooks/check-jid.mjs
// PreToolUse(Bash / git commit *)で呼ばれる。stdin に Claude Code の JSON が来る。
//
// 検査すること
//   1. コミットメッセージが Conventional Commits か(type: subject)
//   2. 末尾の [J-NNN] の書式
//   3. [J-NNN] があれば docs/記録シート.md §1 にその行が存在するか(記録が先、コミットが後)
//   4. [J-NNN] が無い feat / fix / refactor / style は「判断を伴わないか」を SHIN に確認(ask)
//
// 出力は PreToolUse の JSON(permissionDecision: allow / deny / ask)。exit 0 で返す。
// jq に依存しない(Windows + VS Code 環境を想定)。

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const TYPES = ["feat", "fix", "docs", "refactor", "chore", "style", "test", "perf", "ci", "build"];
const ASK_TYPES = ["feat", "fix", "refactor", "style"]; // 判断を伴いやすい type
const SHEET = "docs/記録シート.md";

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {
  process.exit(0);
}

let json;
try {
  json = JSON.parse(input);
} catch {
  process.exit(0);
}

const command = json?.tool_input?.command ?? "";
if (!/\bgit\s+commit\b/.test(command)) process.exit(0);

// -m "..." / -m '...' / --message=... を全部拾う(複数 -m は改行で連結)
const messages = [];
const re = /(?:-m|--message)(?:=|\s+)(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/g;
let m;
while ((m = re.exec(command)) !== null) messages.push(unwrap(m[1] ?? m[2] ?? m[3]));

// Claude Code は既定で -m "$(printf 'subject\n\nbody')" の形で渡す。printf の中身を取り出す
function unwrap(msg) {
  const p = msg.match(/^\$\(printf\s+(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*\)$/);
  if (!p) return msg;
  return (p[1] ?? p[2]).replace(/\\n/g, "\n").replace(/\\'/g, "'");
}

// heredoc(-F - <<'EOF' ... EOF)にも対応
const heredoc = command.match(/<<-?\s*'?([A-Za-z_]+)'?\n([\s\S]*?)\n\1/);
if (heredoc) messages.push(heredoc[2]);

if (messages.length === 0) {
  decide("ask", "コミットメッセージを読み取れませんでした(-m か heredoc で指定してください)。J-ID の有無を手で確認してください。");
}

const full = messages.join("\n");
const subject = full.split("\n")[0].trim();

// 1. Conventional Commits
const typeMatch = subject.match(/^([a-z]+)(\([^)]+\))?!?:\s+\S/);
if (!typeMatch || !TYPES.includes(typeMatch[1])) {
  decide(
    "deny",
    `コミット規約違反: "${subject}"。先頭は ${TYPES.join(" / ")} のいずれか + ": "。例: feat: add search url sync [J-031]`,
  );
}
const type = typeMatch[1];

// 2. J-ID の書式
const jidAll = full.match(/\[J-[^\]]*\]/g) ?? [];
const jidValid = subject.match(/\[J-(\d{3})\]\s*$/);
if (jidAll.length > 0 && !jidValid) {
  decide("deny", `J-ID の書式が違います: ${jidAll.join(", ")}。件名の末尾に [J-NNN](3桁)で付けてください。例: [J-024]`);
}

// 3. 記録シートに行があるか
if (jidValid) {
  const id = `J-${jidValid[1]}`;
  const root = process.env.CLAUDE_PROJECT_DIR ?? json?.cwd ?? process.cwd();
  const sheetPath = join(root, SHEET);
  if (!existsSync(sheetPath)) {
    decide("deny", `${SHEET} が見つかりません(root: ${root})。記録シートを docs/ に置いてからコミットしてください。`);
  }
  const sheet = readFileSync(sheetPath, "utf8");
  const rowRe = new RegExp(`^\\|\\s*${id}(?:\\(任意\\))?\\s*\\|`, "m");
  if (!rowRe.test(sheet)) {
    decide("deny", `${SHEET} §1 に ${id} の行がありません。先に /log-judgment ${id} で下書き行を追加してください(記録が先、コミットが後)。`);
  }
  // 行はあるが「自分の判断」列が空なら止める(AI の初案だけの行を防ぐ)
  const rowLine = sheet.split("\n").find((l) => rowRe.test(l)) ?? "";
  const cells = rowLine.split("|").map((c) => c.trim());
  // 列順: ID 日付 工程 範囲 AIの初案 自分の判断 判断の出所 修正後 対応章 証拠
  if (cells.length >= 8 && cells[6] === "") {
    decide("deny", `${id} の「自分の判断」列が空です。SHIN の判断を書いてからコミットしてください。`);
  }
  decide("allow", `${id} は ${SHEET} に記録済み。`);
}

// 4. J-ID なし
if (ASK_TYPES.includes(type)) {
  decide(
    "ask",
    `J-ID がありません(${type})。AI の案をそのまま採用しただけなら許可してください。却下・条件追加・自分で決めた箇所を含むなら、中止して /log-judgment で採番してから [J-NNN] を付けてください。`,
  );
}

decide("allow", `${type}: J-ID なしで可(判断を伴わない種別)。`);
