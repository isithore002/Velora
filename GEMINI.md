# KeeperGuard — Project Rules

## Project Identity
KeeperGuard is an anomaly detection and protective execution agent for crypto wallets.
It uses a two-agent pattern: Alpha (detection) and Gamma (critique).
All onchain execution flows through KeeperHub (keeperhub.com).

## Tech Stack
- Monorepo: Turborepo + pnpm
- Agent runtime: Node.js 20 + TypeScript + tsx
- Dashboard: Next.js 14 (App Router) + Tailwind + shadcn/ui + Zustand
- AI: LangChain + OpenAI GPT-4o
- Blockchain: Ethers.js v6 + Alchemy/Infura
- Database: SQLite (better-sqlite3) for local audit storage
- Build: tsup for packages, next build for web

## Architecture Rules
1. NEVER write business logic in UI components. All logic lives in packages/core.
2. NEVER call KeeperHub directly from the dashboard. Use the agent runtime API.
3. ALWAYS use Zod for runtime validation of external data (tx data, API responses).
4. ALWAYS log to audit trail BEFORE and AFTER every KeeperHub execution.
5. NEVER hardcode private keys. Use environment variables + KeeperHub Turnkey wallets.
6. ALWAYS handle failures with exponential backoff (max 3 retries).
7. Gamma MUST approve Alpha's decision before any protective action executes.

## File Organization
- packages/core: Shared types, risk engine, action registry, audit logger, KeeperHub client
- apps/agent: Alpha agent, Gamma agent, main loop, CLI entry
- apps/web: Dashboard ONLY. No direct blockchain calls.
- packages/adapters: Framework wrappers (LangChain tool, ElizaOS plugin, CrewAI tool)
- workflows/: KeeperHub workflow JSON definitions

## Naming Conventions
- PascalCase for classes (RiskEngine, CritiqueAgent)
- camelCase for functions and variables
- kebab-case for file names
- SCREAMING_SNAKE_CASE for constants
- Async functions must start with verb (detectThreat, critiqueDecision, executeAction)

## TypeScript Rules
- Strict mode enabled everywhere
- No `any` type. Use `unknown` with Zod parsing.
- Explicit return types on all public functions
- No implicit returns

## KeeperHub Integration Rules
- Use MCP server for agent-native tool discovery
- Use REST API for workflow execution and audit queries
- Always simulate before execute when possible
- Always use Smart Gas Estimation
- Always prefer Private Routing for MEV protection
- Log every KeeperHub call with: timestamp, workflowId, inputs, gasUsed, txHash, status

## Security Rules
- NEVER log API keys or wallet private keys
- NEVER commit .env files
- All spender addresses must be checked against knownProtocols.json
- Unlimited approvals (type(uint256).max) are ALWAYS flagged as high risk

## Testing Rules
- Every package in packages/ must have vitest tests
- Minimum 80% coverage for packages/core
- Mock external APIs (Alchemy, KeeperHub) in tests

## Commit Rule
After every ~1,000 lines of code (insertions or deletions), the agent MUST:
- Run `git diff --stat` to check current change size
- If total lines changed >= 1,000 since last commit:
  - `git add .`
  - `git commit -m "feat(<phase>): <component> — <brief description>"`
- Never exceed 1,500 lines in a single uncommitted batch
