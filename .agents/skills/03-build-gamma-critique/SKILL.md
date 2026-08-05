---
name: build-gamma-critique
description: "Build the Gamma critique agent that challenges Alpha's decisions before execution using LangChain + OpenAI."
---

# Skill: Build Gamma Critique Agent

## Trigger
User says: "build gamma agent", "build critique layer", "create approval agent"

## Steps
1. Create apps/agent/src/gamma/critique-agent.ts with CritiqueAgent class
2. Define Zod schema for structured output
3. Write skeptical security auditor system prompt
4. Implement circuit breaker (3 failures → fallback)
5. Add mock mode for development

## Verification
- Gamma correctly approves a real DeFi interaction
- Gamma correctly rejects suspicious unlimited approval
- Circuit breaker triggers after 3 simulated failures
