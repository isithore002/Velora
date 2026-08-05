---
name: test-and-demo
description: "Verify the KeeperGuard system is fully operational. Run the continuous monitoring loop in simulation mode."
---
# Skill: Test & Demo KeeperGuard
## Trigger
User says: "test the agent", "run a demo", "verify the system"
## Steps
1. Run `pnpm build` across the monorepo to ensure everything compiles
2. Navigate to apps/agent and run `pnpm run simulate`
3. Verify that the agent successfully processes mock transactions
4. Verify Gamma critique correctly overrides or approves Alpha
5. Navigate to apps/web and run `pnpm run dev` to showcase the UI
## Verification
- Both the agent CLI and the web dashboard function correctly.
- Agent output clearly shows Alpha detection -> Gamma critique -> Execution.
