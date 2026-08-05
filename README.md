# Velora 🛡️

**The Anomaly Response Agent**

Velora is an AI agent that protects crypto wallets by detecting anomalous transactions and executing protective actions (revoke allowances, sweep funds) via KeeperHub. It is built for a hackathon and demonstrates a modern two-agent pattern.

## Architecture

Velora uses a Two-Agent pattern:
1. **Alpha Agent (Detector)**: Analyzes incoming blockchain events against heuristics (e.g. unknown spender, unlimited approval, large amount, etc). It scores risk from 0-100.
2. **Gamma Agent (Critique)**: If Alpha's score exceeds a configured threshold, the event is sent to Gamma (an LLM-powered agent via OpenAI). Gamma critiques Alpha's reasoning and either approves the action, rejects it, or overrides it (e.g. from "alert_only" to "revoke_allowance").

All on-chain execution flows strictly through **KeeperHub**.

## Project Structure

This is a Turborepo monorepo using `pnpm`.

- `packages/core/`: Shared business logic, Risk Engine (Alpha), Audit Logger, and KeeperHub Client.
- `packages/adapters/`: Framework integrations (LangChain, ElizaOS) making Velora reusable.
- `apps/agent/`: The Node.js runtime executing the continuous Alpha + Gamma loop.
- `apps/web/`: A Next.js (App Router) dashboard for monitoring threats and simulating events.
- `workflows/`: JSON definitions for KeeperHub workflows.
- `.agents/skills/`: Google Antigravity custom skills to automate project maintenance and expansion.

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build all packages:
   ```bash
   pnpm build
   ```

3. Configure Environment variables:
   Copy `.env.example` to `.env` in `apps/agent` and add your API keys:
   ```
   KEEPERHUB_API_KEY=your_key
   KEEPERHUB_ORG_ID=your_org
   OPENAI_API_KEY=your_key
   MONITORED_WALLET=0xYourWallet
   COLD_WALLET=0xYourColdWallet
   THRESHOLD=70
   ```

4. Run the Agent (Simulate Mode):
   ```bash
   cd apps/agent
   pnpm run simulate
   ```

5. Run the Dashboard:
   ```bash
   cd apps/web
   pnpm run dev
   ```

## Design Constraints
- All on-chain execution **MUST** go through KeeperHub.
- Gamma **MUST** approve before any protective action executes.
- Dashboard is strictly read-only for blockchain data.
