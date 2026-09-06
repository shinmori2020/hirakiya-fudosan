# .claude/ と CLAUDE.md の配置(2026-09-07 v0.2・Docker 前提に修正)

このフォルダの中身をリポジトリ `hirakiya-fudosan/` のルートにそのまま置く。

CLAUDE.md
.claude/settings.json
.claude/rules/record-keeping.md
.claude/rules/fictional-data.md
.claude/rules/forms.md
.claude/rules/search.md
.claude/rules/static-rendering.md
.claude/skills/record-judgment/SKILL.md
.claude/commands/log-judgment.md
.claude/commands/export-wp.md
.claude/hooks/check-jid.mjs
docs/templates/decision.md
docs/templates/weekly.md

配置後にやること
1. docs/ に 00-制作計画.md / 01-設計図.md / 02-物件データ設計.md / 記録シート.md を置く(hook が docs/記録シート.md を読む)
2. .gitignore は Docker 一式に同梱したものを使う(CLAUDE.local.md / .claude/settings.local.json / web/.env.local / .env / wp/uploads を含む)
3. Cursor(Claude Code 拡張)で開き /context で CLAUDE.md と rules 5本が Memory files に出るか確認
4. /hooks で PreToolUse に check-jid.mjs が出るか確認
5. 公式スキル3つをインストール(npx skills add ...)
6. 動作確認:git commit -m "docs: init" → allow / git commit -m "feat: x" → ask
