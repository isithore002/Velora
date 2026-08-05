---
name: build-keeperhub-client
description: "Build the KeeperHub integration layer with REST API client, retry logic, and workflow builders."
---
# Skill: Build KeeperHub Client
## Trigger
User says: "build keeperhub client", "integrate keeperhub", "connect mcp"
## Steps
1. Create packages/core/src/keeperhub-client.ts with KeeperHubClient class
2. Implement retry logic with exponential backoff
3. Create workflow builders (revoke, sweep, heartbeat)
4. Add SQLite tracking for deployed workflow IDs
## Verification
- Client can list action schemas and create/execute workflows
- Retry logic works on simulated 500 errors
