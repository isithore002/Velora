# Velora Project Context

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

## Documentation & References
- **KeeperHub**: Whenever integrating with or troubleshooting KeeperHub APIs, consult the official documentation at [https://docs.keeperhub.com/](https://docs.keeperhub.com/). You can use the `read_url_content` or `search_web` tools to fetch specific pages when needed.
- **KeeperHub API Keys**: The `kh_` organization API keys carry the organization context automatically. When configuring the `.env` (like `KEEPERHUB_ORG_ID`), a placeholder like `org_default` is sufficient since the backend uses the API key to identify the organization.
