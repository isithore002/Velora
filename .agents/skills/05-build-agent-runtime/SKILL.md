---
name: build-agent-runtime
description: "Wire Alpha + Gamma + KeeperHub into a continuous monitoring loop with CLI commands."
---
# Skill: Build Agent Runtime
## Trigger
User says: "build runtime", "build main loop", "create agent cli"
## Steps
1. Create apps/agent/src/index.ts with main monitoring loop
2. Create CLI commands: start, simulate, audit
3. Build execution queue with nonce ordering
4. Add graceful shutdown handler
## Verification
- Simulate mode runs test tx through pipeline without executing
- Start mode polls and logs every 30 seconds
