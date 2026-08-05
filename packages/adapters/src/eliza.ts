import { KeeperHubClient, type ProtectiveAction } from "@velora/core";

// Mocking ElizaOS types for the adapter interface
type ElizaAction = {
  name: string;
  description: string;
  similars: string[];
  handler: (runtime: any, message: any, state: any) => Promise<boolean>;
};

type ElizaPlugin = {
  name: string;
  description: string;
  actions: ElizaAction[];
};

/**
 * Creates an ElizaOS plugin for Velora protection capabilities.
 * Allows Eliza-based agents to trigger KeeperHub protective workflows.
 * 
 * @param keeperHubClient An authenticated instance of KeeperHubClient
 */
export function createVeloraElizaPlugin(keeperHubClient: KeeperHubClient): ElizaPlugin {
  return {
    name: "velora-protect",
    description: "Enables the agent to execute protective onchain actions via KeeperHub in response to wallet anomalies.",
    actions: [
      {
        name: "EXECUTE_PROTECTION",
        description: "Executes a protective onchain action via KeeperHub (e.g., revoking allowance, sweeping funds).",
        similars: ["REVOKE_ALLOWANCE", "SWEEP_FUNDS", "PROTECT_WALLET", "PAUSE_CONTRACT"],
        handler: async (runtime: any, message: any, state: any) => {
          try {
            // Extract necessary parameters from state/message context (Eliza specific)
            const action = state.actionToTake as ProtectiveAction || "alert_only";
            const tokenAddress = state.tokenAddress;
            const spenderAddress = state.spenderAddress;
            const amount = state.amount;
            const monitoredWallet = state.monitoredWallet;
            const coldWallet = state.coldWallet;

            let workflowId = "";
            switch (action) {
              case "revoke_allowance": workflowId = "wf_revoke_allowance"; break;
              case "sweep_funds": workflowId = "wf_sweep_funds"; break;
              case "pause_contract": workflowId = "wf_pause_contract"; break;
              case "alert_only": return true;
              default: return false;
            }

            await keeperHubClient.executeWorkflow(workflowId, {
              tokenAddress,
              spenderAddress,
              amount,
              config: {
                monitoredWallet,
                coldWallet
              }
            });

            return true;
          } catch (error) {
            console.error("Eliza Velora Action Failed:", error);
            return false;
          }
        }
      }
    ]
  };
}
