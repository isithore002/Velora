---
name: build-risk-engine
description: "Build the Alpha detection engine in packages/core. This engine receives blockchain events and scores them 0-100 based on configurable heuristics."
---

# Skill: Build Risk Engine (Alpha Agent Core)

## Trigger
User says: "build risk engine", "build alpha agent", "create detection logic"

## Steps
1. Create packages/core/src/risk-engine.ts with RiskEngine class
2. Implement 5 heuristics: UNLIMITED_APPROVAL, UNKNOWN_SPENDER, LARGE_AMOUNT, NEW_CONTRACT, SUSPICIOUS_FUNCTION
3. Create packages/core/src/action-registry.ts with protocol overrides
4. Create packages/core/src/known-protocols.json whitelist
5. Write vitest tests

## Verification
- All tests pass: `pnpm test --filter @keeperguard/core`
- RiskEngine correctly scores test events across all threat levels
