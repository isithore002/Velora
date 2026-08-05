import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { KeeperHubClient, ProtectiveActionSchema, type ProtectiveAction } from "@keeperguard/core";

/**
 * Creates a LangChain tool that allows any LLM agent to execute protective actions
 * via KeeperHub (e.g. revoke allowances, sweep funds).
 * 
 * @param keeperHubClient An authenticated instance of KeeperHubClient
 */
export function createKeeperGuardTool(keeperHubClient: KeeperHubClient) {
  return tool(
    async ({ action, tokenAddress, spenderAddress, amount, monitoredWallet, coldWallet }) => {
      try {
        // Find the appropriate workflow ID. In a real system, you'd fetch this from KeeperHub.
        // We're mimicking the flow where KeeperHub hosts standard "revoke" and "sweep" workflows.
        let workflowId = "";
        
        switch (action) {
          case "revoke_allowance":
            workflowId = "wf_revoke_allowance";
            break;
          case "sweep_funds":
            workflowId = "wf_sweep_funds";
            break;
          case "pause_contract":
            workflowId = "wf_pause_contract";
            break;
          case "alert_only":
            return "Alert logged successfully. No onchain action taken.";
          default:
            return `Unknown action: ${action}`;
        }

        const runResult = await keeperHubClient.executeWorkflow(workflowId, {
          tokenAddress,
          spenderAddress,
          amount,
          config: {
            monitoredWallet,
            coldWallet
          }
        });

        return `Successfully executed ${action}. Transaction Hash: ${runResult.txHash ?? "pending"}`;
      } catch (error) {
        return `Failed to execute ${action}: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    {
      name: "keeperguard_protect",
      description: "Executes a protective onchain action via KeeperHub (e.g., revoking allowance, sweeping funds) in response to a detected anomaly.",
      schema: z.object({
        action: ProtectiveActionSchema,
        tokenAddress: z.string().describe("The ERC20/ERC721 contract address involved"),
        spenderAddress: z.string().optional().describe("The malicious spender address to revoke (if applicable)"),
        amount: z.string().optional().describe("The amount involved"),
        monitoredWallet: z.string().describe("The wallet being protected"),
        coldWallet: z.string().optional().describe("The secure cold wallet to sweep funds to (if action is sweep_funds)"),
      }),
    }
  );
}
