---
name: setup-keeperguard-project
description: "Scaffold the KeeperGuard monorepo with Turborepo, pnpm, TypeScript strict mode, and all workspace packages. This skill runs ONCE at project initialization."
---

# Skill: Setup KeeperGuard Project

## Trigger
User says: "setup keeperguard", "scaffold project", "initialize monorepo"

## Steps
1. Create root package.json with pnpm workspaces
2. Add shared devDependencies: typescript, eslint, prettier, vitest, tsup, turbo
3. Create tsconfig.json files for each workspace with strict: true
4. In packages/core, create types and barrel export
5. In apps/agent, create CLI entry point
6. In apps/web, create Next.js 14 app with Tailwind
7. Add root .gitignore, .env.example, and turbo.json

## Verification
- Run `pnpm install` successfully
- Run `pnpm build` with zero errors
- All packages compile with strict TypeScript
