---
name: integrate-adapters
description: "Build framework-agnostic adapters for Velora so it can be used in LangChain or ElizaOS."
---
# Skill: Integrate Framework Adapters
## Trigger
User says: "build adapters", "integrate langchain", "integrate eliza", "create sdk"
## Steps
1. Create packages/adapters workspace
2. Implement LangChain tool wrapper for KeeperHub execution
3. Implement ElizaOS plugin action for KeeperHub execution
4. Export them via barrel file
## Verification
- Adapter package compiles with `tsup`
- Interfaces properly type-check against `@velora/core`
