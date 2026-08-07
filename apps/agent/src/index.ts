import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import {
  AuditLogger,
  KeeperHubClient,
  type DetectedEvent,
  type AuditEntry,
} from "@velora/core";

import { AlphaAgent } from "./alpha/detector.js";
import { CritiqueAgent } from "./gamma/critique-agent.js";
import { triggerProtection, deployProtectiveWorkflow } from "./keeperhub/workflows.js";
import { createMockEvents } from "./engine/mock-events.js";
import { SqliteAuditManager } from "./engine/audit-manager.js";
import { ethers } from "ethers";
import { WebSocketServer } from "ws";

// ─── Configuration ──────────────────────────────────────────────────────────

const KEEPERHUB_API_KEY = process.env["KEEPERHUB_API_KEY"] ?? "kh_mock";
const KEEPERHUB_ORG_ID = process.env["KEEPERHUB_ORG_ID"] ?? "org_mock";
const GEMINI_API_KEY = process.env["GEMINI_API_KEY"] ?? "your_mock_key";
const MONITORED_WALLET = process.env["MONITORED_WALLET"] ?? "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28";
const COLD_WALLET = process.env["COLD_WALLET"] ?? "0x0000000000000000000000000000000000C01D00";
const THRESHOLD = Number(process.env["THRESHOLD"] ?? "70");
const CHAIN_ID = Number(process.env["CHAIN_ID"] ?? "8453");
const POLL_INTERVAL = Number(process.env["POLL_INTERVAL_MS"] ?? "30000");
const WSS_RPC_URL = process.env["WSS_RPC_URL"] ?? "";

// ─── Initialize ─────────────────────────────────────────────────────────────

const auditLogger = new AuditLogger();
const auditManager = new SqliteAuditManager(auditLogger);
const alphaAgent = new AlphaAgent({ gammaThreshold: THRESHOLD }, auditLogger);
const gammaAgent = new CritiqueAgent(GEMINI_API_KEY);
const keeperHubClient = new KeeperHubClient(KEEPERHUB_API_KEY, KEEPERHUB_ORG_ID, {
  mockMode: !KEEPERHUB_API_KEY.startsWith("kh_"),
});
await keeperHubClient.initializeMCP();

let isRunning = false;
let processedTxHashes: Set<string> = new Set();

// ─── WebSocket Server ───────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: 3001 });
console.log("📡 WebSocket Server listening on port 3001");

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({
    type: "INIT",
    entries: auditLogger.getEntries({ limit: 50 })
  }));

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "SIMULATE_ATTACK") {
        console.log("🚨 Received manual simulate attack trigger from dashboard");
        const syntheticEvent = createMockEvents(1)[0];
        if (syntheticEvent) {
          syntheticEvent.contractAddress = MONITORED_WALLET; // Set to user's wallet
          syntheticEvent.amount = "1000.0"; // Large suspicious amount
          await processEvent(syntheticEvent);
        }
      } else if (msg.type === "SIMULATE_TRUE_THREAT") {
        console.log("🚨 Received manual TRUE THREAT trigger from dashboard");
        // Guarantee a malicious scenario is selected (scenario index 0 is unlimited approval to unknown spender)
        const allMocks = createMockEvents(10);
        const maliciousEvent = allMocks.find(e => e.amount === "115792089237316195423570985008687907853269984665640564039457584007913129639935") || createMockEvents(1)[0];
        if (maliciousEvent) {
          maliciousEvent.contractAddress = MONITORED_WALLET;
          await processEvent(maliciousEvent);
        }
      }
    } catch (e) {
      // Ignore
    }
  });
});

auditLogger.onUpdate((entry: AuditEntry) => {
  const payload = JSON.stringify({ type: "UPDATE", entry });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
});

// ─── CLI Mode Detection ─────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--audit")) {
  printAuditTrail();
} else if (args.includes("--simulate")) {
  const txIndex = args.indexOf("--tx");
  const txHash = txIndex >= 0 ? args[txIndex + 1] : undefined;
  await simulateMode(txHash);
} else {
  await startMonitoring();
}

// ─── Monitor Mode ───────────────────────────────────────────────────────────

async function startMonitoring(): Promise<void> {
  isRunning = true;
  const isMockData = !WSS_RPC_URL;

  console.log(JSON.stringify({
    type: "agent_start",
    wallet: MONITORED_WALLET,
    coldWallet: COLD_WALLET,
    threshold: THRESHOLD,
    chainId: CHAIN_ID,
    pollInterval: POLL_INTERVAL,
    mockMode: keeperHubClient.isMockMode(),
    timestamp: Date.now(),
  }));

  console.log(`
╔══════════════════════════════════════════════════════════╗
║                   🛡️  VELORA v0.1                       ║
║          Anomaly Detection & Response Agent              ║
╠══════════════════════════════════════════════════════════╣
║  Wallet:    ${MONITORED_WALLET.slice(0, 10)}...${MONITORED_WALLET.slice(-6)}                    ║
║  Chain:     ${CHAIN_ID}                                          ║
║  Threshold: ${THRESHOLD}/100                                       ║
║  Mode:      ${keeperHubClient.isMockMode() ? "MOCK (no live execution)" : "LIVE 🔴"}             ║
║  Data:      ${isMockData ? "MOCK EVENTS 🧪" : "LIVE WEBSOCKET 🌐"}                  ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\\n🛑 Shutting down gracefully...");
    isRunning = false;
    auditManager.close();
  });

  process.on("SIGTERM", () => {
    console.log("\\n🛑 Received SIGTERM, finishing current iteration...");
    isRunning = false;
    auditManager.close();
  });

  if (isMockData) {
    console.log("No WSS_RPC_URL provided. Falling back to MOCK events engine.");
    // Main loop
    while (isRunning) {
      try {
        await pollAndProcess();
      } catch (error) {
        console.error(JSON.stringify({
          type: "poll_error",
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        }));
      }

      if (isRunning) {
        await sleep(POLL_INTERVAL);
      }
    }
  } else {
    console.log(`Connecting to WebSocket provider at ${WSS_RPC_URL}...`);
    const provider = new ethers.WebSocketProvider(WSS_RPC_URL);
    
    provider.on("pending", async (txHash: string) => {
      if (!isRunning) return;
      try {
        const tx = await provider.getTransaction(txHash);
        if (!tx) return;
        
        // Check if our monitored wallet is involved
        if (tx.from?.toLowerCase() === MONITORED_WALLET.toLowerCase() || 
            tx.to?.toLowerCase() === MONITORED_WALLET.toLowerCase()) {
            
            if (processedTxHashes.has(tx.hash)) return;
            processedTxHashes.add(tx.hash);
            
            const event = await parseEthersTx(tx);
            if (event) {
              console.log(`[Live WebSockets] Detected pending tx ${tx.hash} involving monitored wallet`);
              await processEvent(event);
            }
        }
      } catch (err) {
         // ignore fetch errors for fast moving mempool
      }
    });

    // Keep process alive
    while (isRunning) {
      await sleep(10000);
    }
    provider.removeAllListeners();
  }

  console.log(`\n📊 Session Summary: ${auditLogger.getCount()} events processed`);
}

// ─── Simulate Mode ──────────────────────────────────────────────────────────

async function simulateMode(txHash?: string): Promise<void> {
  console.log("\n🧪 SIMULATE MODE — No actions will be executed\n");

  const events = txHash
    ? [createMockEvents(1, txHash)[0]!]
    : createMockEvents(3);

  for (const event of events) {
    if (!event) continue;
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📌 Transaction: ${event.txHash}`);

    // Alpha analysis
    const alphaDecision = alphaAgent.analyze(event);
    console.log(`\n🔍 Alpha Score: ${alphaDecision.riskScore}/100 (${alphaDecision.threatLevel.toUpperCase()})`);
    console.log(`   Proposed Action: ${alphaDecision.proposedAction}`);
    console.log(`   Heuristics:`);
    for (const h of alphaDecision.triggeredHeuristics) {
      console.log(`     • ${h.name} (+${h.score})`);
    }

    if (alphaAgent.shouldEscalateToGamma(alphaDecision.riskScore)) {
      // Gamma critique
      console.log(`\n🧠 Gamma Critique (score > ${THRESHOLD}):`);
      const critique = await gammaAgent.critique(
        event,
        alphaDecision,
        auditLogger.getEntries({ limit: 10 })
      );
      console.log(`   Approve: ${critique.approve ? "✅" : "❌"}`);
      console.log(`   Confidence: ${(critique.confidence * 100).toFixed(0)}%`);
      console.log(`   Reasoning: ${critique.reasoning}`);
      if (critique.overrideAlpha) {
        console.log(`   ⚠️  OVERRIDE: ${critique.suggestedAction}`);
      }
    } else {
      console.log(`\n🧠 Gamma: Skipped (score ${alphaDecision.riskScore} < threshold ${THRESHOLD})`);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("✅ Simulation complete\n");
}

// ─── Audit Mode ─────────────────────────────────────────────────────────────

function printAuditTrail(): void {
  const entries = auditLogger.getEntries({ limit: 20 });

  if (entries.length === 0) {
    console.log("\n📋 No audit entries found. Start monitoring to generate data.\n");
    return;
  }

  console.log("\n📋 Last 20 Audit Entries:\n");
  console.log("Time                 Tx Hash         Score  Level     Action            Status");
  console.log("─".repeat(90));

  for (const entry of entries) {
    const time = new Date(entry.timestamp).toISOString().slice(11, 19);
    const tx = entry.event.txHash.slice(0, 12) + "...";
    const score = String(entry.alphaDecision.riskScore).padStart(3);
    const level = entry.alphaDecision.threatLevel.padEnd(8);
    const action = entry.finalAction.padEnd(16);
    const status = entry.status;

    console.log(`${time}  ${tx}  ${score}    ${level}  ${action}  ${status}`);
  }

  console.log("");
}

// ─── Core Processing Pipeline ───────────────────────────────────────────────

async function pollAndProcess(): Promise<void> {
  // Get new events (mock for now)
  const events = createMockEvents(
    Math.random() > 0.7 ? 1 : 0  // ~30% chance of event each poll
  );

  for (const event of events) {
    if (processedTxHashes.has(event.txHash)) continue;
    processedTxHashes.add(event.txHash);

    await processEvent(event);
  }
}

async function processEvent(event: DetectedEvent): Promise<void> {
  // Step 1: Alpha Analysis
  const alphaDecision = alphaAgent.analyze(event);
  const auditEntry = auditLogger.createEntry(event, alphaDecision);

  // Step 2: Check if Gamma critique is needed
  if (!alphaAgent.shouldEscalateToGamma(alphaDecision.riskScore)) {
    // Low risk — alert only
    auditLogger.updateStatus(auditEntry.id, "confirmed");
    return;
  }

  // Step 3: Pause 5 seconds before Gamma (give time for context)
  await sleep(5000);
  auditLogger.updateStatus(auditEntry.id, "critiquing");

  // Step 4: Gamma Critique
  const critique = await gammaAgent.critique(
    event,
    alphaDecision,
    auditLogger.getEntries({ limit: 10 })
  );
  auditLogger.addCritique(auditEntry.id, critique);

  // Step 5: Execute or reject
  if (critique.approve) {
    auditLogger.markExecuting(auditEntry.id);

    const finalAction = critique.overrideAlpha
      ? critique.suggestedAction
      : alphaDecision.proposedAction;

    try {
      // Deploy and trigger KeeperHub workflow
      const workflowId = await deployProtectiveWorkflow(
        keeperHubClient,
        finalAction,
        {
          tokenAddress: event.contractAddress,
          spenderAddress: event.spender,
          amount: event.amount,
          config: {
            chain: CHAIN_ID === 1 ? "ethereum" : "base",
            monitoredWallet: MONITORED_WALLET,
            coldWallet: COLD_WALLET,
          },
        }
      );

      if (workflowId !== "alert_only_no_workflow") {
        const result = await triggerProtection(keeperHubClient, workflowId, {
          txHash: event.txHash,
          timestamp: Date.now(),
        });

        auditLogger.markConfirmed(
          auditEntry.id,
          result.txHash ?? "no-tx",
          result.gasUsed ?? 0
        );
      } else {
        auditLogger.updateStatus(auditEntry.id, "confirmed");
      }
    } catch (error) {
      console.error(JSON.stringify({
        type: "execution_error",
        entryId: auditEntry.id,
        error: error instanceof Error ? error.message : String(error),
      }));
      auditLogger.markFailed(auditEntry.id);
    }
  } else {
    // Gamma rejected — alert only
    console.log(JSON.stringify({
      type: "gamma_rejection",
      entryId: auditEntry.id,
      txHash: event.txHash,
      reasoning: critique.reasoning,
    }));
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseEthersTx(tx: ethers.TransactionResponse): Promise<DetectedEvent | null> {
  // If to is null, it's a contract creation
  if (!tx.to) return null;
  
  const data = tx.data;
  let functionName = "transfer";
  let spender: string | undefined;
  let amount: string | undefined;
  const functionSelector = data.length >= 10 ? data.slice(0, 10) : undefined;
  
  // Very basic ERC20 approve parsing
  // approve(address,uint256) selector is 0x095ea7b3
  if (functionSelector === "0x095ea7b3" && data.length >= 138) {
    functionName = "approve";
    spender = "0x" + data.slice(34, 74);
    amount = ethers.formatEther(ethers.toBigInt("0x" + data.slice(74, 138)));
  } else if (functionSelector) {
    functionName = "contract_interaction";
  }

  return {
    txHash: tx.hash,
    chainId: Number(tx.chainId),
    contractAddress: tx.to,
    spender,
    amount,
    functionSelector,
    functionName,
    timestamp: Date.now(),
    riskScore: 0,
  };
}
