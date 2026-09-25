<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Before finishing a task

Run `npm run typecheck` and fix any TypeScript errors before considering the task complete. Do not finish with a failing typecheck.

When a UI change needs visual verification, follow [.agents/skills/agent-browser/SKILL.md](.agents/skills/agent-browser/SKILL.md) to screenshot and inspect the result before finishing. Assume the app is already running at `http://localhost:3000`. Skip this when the task does not change user-visible UI.

# Tests

`npm test` drives a real browser through the `agent-browser` CLI and expects the app running at `http://localhost:3000` (override with `APP_URL`). Set `AGENT_BROWSER_BIN` if `agent-browser` is not on `PATH`.
