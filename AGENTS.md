# KeeperGuard Project Context

## What We're Building
An AI agent that protects crypto wallets by detecting anomalous transactions
and executing protective actions (revoke allowances, sweep funds) via KeeperHub.

## Two-Agent Pattern
- Alpha Agent: Detects threats, scores risk 0-100, proposes protective action
- Gamma Agent: Critiques Alpha's decision before execution. Acts as circuit breaker.

## Key Directories
- apps/agent/ — Node.js runtime for Alpha + Gamma + main loop
- apps/web/ — Next.js dashboard for monitoring and simulation
- packages/core/ — Shared business logic and KeeperHub client
- packages/adapters/ — Framework integrations (LangChain, ElizaOS, CrewAI)

## External APIs
- KeeperHub (keeperhub.com) — Onchain execution layer
- Alchemy/Infura — Blockchain data
- OpenAI — Gamma critique LLM

## Important Constraints
- All onchain execution MUST go through KeeperHub
- Gamma MUST approve before any protective action
- Dashboard is read-only for blockchain data; agent handles all writes
