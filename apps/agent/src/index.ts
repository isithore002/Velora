import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: '../../.env', override: true });

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
import { createServer } from "http";

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
  mockMode: !KEEPERHUB_API_KEY.startsWith("kh_") || KEEPERHUB_API_KEY === "kh_your_api_key_here",
});
await keeperHubClient.initializeMCP().catch(() => {
  // MCP SSE connection is optional — agent falls back to REST API
  console.log("ℹ️  MCP connection unavailable, using REST API fallback");
});

let isRunning = false;
let processedTxHashes: Set<string> = new Set();

// ─── WebSocket Server ───────────────────────────────────────────────────────

function createWSS(port: number): Promise<WebSocketServer> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", (err: NodeJS.ErrnoException) => {
      reject(err);
    });
    server.listen(port, () => {
      const wss = new WebSocketServer({ server });
      resolve(wss);
    });
  });
}

let wss: WebSocketServer;
try {
  wss = await createWSS(3001);
  console.log("📡 WebSocket Server listening on port 3001");
} catch {
  console.log("⚠️  Port 3001 in use, waiting 2s for cleanup...");
  await new Promise(r => setTimeout(r, 2000));
  try {
    wss = await createWSS(3001);
    console.log("📡 WebSocket Server listening on port 3001 (retry)");
  } catch {
    console.log("⚠️  Port 3001 still in use, attempting to use random port...");
    try {
      wss = await createWSS(0); // Port 0 assigns a random available port
      console.log("📡 WebSocket Server listening on random available port");
    } catch (e) {
      console.log("⚠️  Failed to start WebSocket Server entirely.", e);
    }
  }
}

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

process.on("SIGINT", () => {
  wss.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  wss.close();
  process.exit(0);
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
    // ─── Use HTTP provider for RELIABLE polling (WSS subscriptions are flaky on free-tier Alchemy) ───
    const httpRpcUrl = WSS_RPC_URL.replace("wss://", "https://").replace("ws://", "http://");
    const provider = new ethers.JsonRpcProvider(httpRpcUrl);
    
    // Verify connection works
    try {
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Connected to chain ${network.chainId} (block #${blockNumber})`);
      console.log(`🔍 Monitoring wallet: ${MONITORED_WALLET}`);
      console.log(`🔒 Cold wallet: ${COLD_WALLET}`);
      console.log(`📡 Polling every 4 seconds for new transactions...\n`);
    } catch (err) {
      console.error("❌ Failed to connect to RPC:", err);
      return;
    }

    // Track the last block we've scanned
    let lastScannedBlock = await provider.getBlockNumber();
    console.log(`Starting scan from block #${lastScannedBlock}`);

    // ─── PRIMARY: Poll for new blocks every 4 seconds ───
    while (isRunning) {
      try {
        const currentBlock = await provider.getBlockNumber();
        
        if (currentBlock > lastScannedBlock) {
          // Scan each new block
          for (let blockNum = lastScannedBlock + 1; blockNum <= currentBlock; blockNum++) {
            const block = await provider.getBlock(blockNum, true);
            if (!block) continue;
            
            console.log(`📦 Scanning block #${blockNum} (${block.prefetchedTransactions?.length ?? 0} txs)`);
            
            if (block.prefetchedTransactions) {
              for (const tx of block.prefetchedTransactions) {
                const fromMatch = tx.from?.toLowerCase() === MONITORED_WALLET.toLowerCase();
                const toMatch = tx.to?.toLowerCase() === MONITORED_WALLET.toLowerCase();
                
                if (fromMatch || toMatch) {
                  if (processedTxHashes.has(tx.hash)) continue;
                  processedTxHashes.add(tx.hash);
                  
                  console.log(`\n🚨 DETECTED tx ${tx.hash} involving monitored wallet!`);
                  console.log(`   From: ${tx.from} | To: ${tx.to}`);
                  
                  const event = await parseEthersTx(tx as any);
                  if (event) {
                    await processEvent(event);
                  }
                }
              }
            }
          }
          lastScannedBlock = currentBlock;
        }
      } catch (err) {
        console.error("Poll error:", err instanceof Error ? err.message : err);
      }
      
      await sleep(4000);
    }
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

    // Warden analysis
    const alphaDecision = alphaAgent.analyze(event);
    console.log(`\n🔍 Warden Score: ${alphaDecision.riskScore}/100 (${alphaDecision.threatLevel.toUpperCase()})`);
    console.log(`   Proposed Action: ${alphaDecision.proposedAction}`);
    console.log(`   Heuristics:`);
    for (const h of alphaDecision.triggeredHeuristics) {
      console.log(`     • ${h.name} (+${h.score})`);
    }

    if (alphaAgent.shouldEscalateToGamma(alphaDecision.riskScore)) {
      // Judge critique
      console.log(`\n🧠 Judge Critique (score > ${THRESHOLD}):`);
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
      console.log(`\n🧠 Judge: Skipped (score ${alphaDecision.riskScore} < threshold ${THRESHOLD})`);
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
  // Step 1: Warden Analysis
  const alphaDecision = alphaAgent.analyze(event);
  const auditEntry = auditLogger.createEntry(event, alphaDecision);

  // Step 2: Check if Judge critique is needed
  if (!alphaAgent.shouldEscalateToGamma(alphaDecision.riskScore)) {
    console.log("   ↳ Threat score below threshold. Executing Alpha action immediately.");
    auditLogger.updateStatus(auditEntry.id, "confirmed");
    return;
  }

  // Step 3: Pause 5 seconds before Judge (give time for context)
  console.log("   ↳ Escalating to Judge. Waiting 5 seconds for simulated network context...");
  await sleep(5000);
  auditLogger.updateStatus(auditEntry.id, "critiquing");

  // Step 4: Judge Critique
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
      // ─── KEEPERHUB DIRECT EXECUTION API ───
      // Uses POST /api/execute/transfer and /api/execute/contract-call
      // Following the official KeeperHub safe-first-write sequence:
      // 1. Simulate → 2. Execute with idempotency key → 3. Poll status
      
      const KEEPERHUB_API_KEY = process.env["KEEPERHUB_API_KEY"] ?? "";
      const KEEPERHUB_BASE = "https://app.keeperhub.com/api";
      
      if (finalAction === "sweep_funds") {
        console.log(`\n⚡ EXECUTING VIA KEEPERHUB: ${finalAction}`);
        console.log(`   Action: Transfer ETH to cold wallet via KeeperHub Direct Execution`);
        
        // Step 1: Simulate the transfer first
        console.log(`   📋 Step 1: Simulating transfer on KeeperHub...`);
        const simBody = {
          chainId: "84532",
          recipientAddress: COLD_WALLET.toLowerCase(),
          amount: "0.0001",
          simulate: true,
        };
        
        const simResponse = await fetch(`${KEEPERHUB_BASE}/execute/transfer`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${KEEPERHUB_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(simBody),
        });
        
        const simResult = await simResponse.json() as any;
        console.log(`   Simulation result:`, JSON.stringify(simResult));
        
        if (simResult.success === false && simResult.wouldRevert) {
          throw new Error(`KeeperHub simulation would revert: ${simResult.error ?? "unknown"}`);
        }
        
        // Step 2: Execute for real with idempotency key
        console.log(`   🚀 Step 2: Broadcasting via KeeperHub...`);
        const idempotencyKey = `velora-sweep-${event.txHash}-${Date.now()}`;
        
        const execBody = {
          chainId: "84532",
          recipientAddress: COLD_WALLET.toLowerCase(),
          amount: "0.0001",
        };
        
        const execResponse = await fetch(`${KEEPERHUB_BASE}/execute/transfer`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${KEEPERHUB_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(execBody),
        });
        
        const execResult = await execResponse.json() as any;
        console.log(JSON.stringify({
          type: "keeperhub_execution",
          action: finalAction,
          executionId: execResult.executionId,
          status: execResult.status,
          txHash: execResult.transactionHash,
          txLink: execResult.transactionLink,
        }));
        
        // Step 3: Poll status if needed
        if (execResult.executionId && execResult.status !== "completed" && execResult.status !== "failed") {
          console.log(`   ⏳ Step 3: Polling execution status...`);
          for (let i = 0; i < 30; i++) {
            await sleep(3000);
            const statusResponse = await fetch(`${KEEPERHUB_BASE}/execute/${execResult.executionId}/status`, {
              headers: { "Authorization": `Bearer ${KEEPERHUB_API_KEY}` },
            });
            const statusResult = await statusResponse.json() as any;
            if (statusResult.status === "completed" || statusResult.status === "failed") {
              execResult.status = statusResult.status;
              execResult.transactionHash = statusResult.transactionHash ?? execResult.transactionHash;
              execResult.transactionLink = statusResult.transactionLink ?? execResult.transactionLink;
              break;
            }
          }
        }
        
        const txHash = execResult.transactionHash ?? "no-tx";
        const gasUsed = 21000;
        // Build verifiable proof link (fallback if KeeperHub doesn't return one)
        const txLink = execResult.transactionLink ?? (txHash !== "no-tx" ? `https://sepolia.basescan.org/tx/${txHash}` : null);
        
        console.log(`   ✅ KeeperHub execution ${execResult.status}: ${txHash}`);
        if (txLink) {
          console.log(`   🔗 PROOF LINK: ${txLink}`);
        }
        
        auditLogger.markConfirmed(auditEntry.id, txHash, gasUsed);
        
      } else if (finalAction === "revoke_allowance") {
        console.log(`\n⚡ EXECUTING VIA KEEPERHUB: ${finalAction}`);
        console.log(`   Action: Revoke token approval via KeeperHub contract-call`);
        
        // Use contract-call to set approval to 0
        const idempotencyKey = `velora-revoke-${event.txHash}-${Date.now()}`;
        const execBody = {
          contractAddress: event.contractAddress,
          chainId: "84532",
          functionName: "approve",
          functionArgs: JSON.stringify([event.spender ?? MONITORED_WALLET, "0"]),
          abi: JSON.stringify([{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]),
        };
        
        const execResponse = await fetch(`${KEEPERHUB_BASE}/execute/contract-call`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${KEEPERHUB_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(execBody),
        });
        
        const execResult = await execResponse.json() as any;
        
        // Poll status if pending (same pattern as sweep)
        if (execResult.executionId && execResult.status !== "completed" && execResult.status !== "failed") {
          console.log(`   ⏳ Polling execution status...`);
          for (let i = 0; i < 30; i++) {
            await sleep(3000);
            const statusResponse = await fetch(`${KEEPERHUB_BASE}/execute/${execResult.executionId}/status`, {
              headers: { "Authorization": `Bearer ${KEEPERHUB_API_KEY}` },
            });
            const statusResult = await statusResponse.json() as any;
            if (statusResult.status === "completed" || statusResult.status === "failed") {
              execResult.status = statusResult.status;
              execResult.transactionHash = statusResult.transactionHash ?? execResult.transactionHash;
              execResult.transactionLink = statusResult.transactionLink ?? execResult.transactionLink;
              break;
            }
          }
        }
        
        const txHash = execResult.transactionHash ?? "no-tx";
        // PR #1990: contract-call now returns transactionLink
        const txLink = execResult.transactionLink ?? (txHash !== "no-tx" ? `https://sepolia.basescan.org/tx/${txHash}` : null);
        
        console.log(JSON.stringify({
          type: "keeperhub_execution",
          action: finalAction,
          executionId: execResult.executionId,
          status: execResult.status,
          txHash,
          txLink,
        }));
        
        console.log(`   ✅ KeeperHub revoke ${execResult.status}: ${txHash}`);
        if (txLink) {
          console.log(`   🔗 PROOF LINK: ${txLink}`);
        }
        
        auditLogger.markConfirmed(auditEntry.id, txHash, 46000);
        
      } else {
        // alert_only or pause_contract — no tx needed
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
    // Judge rejected — alert only
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
