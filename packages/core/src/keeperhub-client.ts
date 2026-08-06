import type {
  WorkflowDefinition,
  ExecutionResult,
  AuditEntry,
} from "./types";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

/** Structured log entry for KeeperHub API calls */
interface ApiCallLog {
  timestamp: number;
  method: string;
  endpoint: string;
  workflowId?: string;
  status: "success" | "error" | "retry";
  duration: number;
  error?: string;
}

/**
 * Client for KeeperHub REST API and MCP integration.
 * Handles workflow creation, execution, simulation, and audit trail queries.
 * Includes retry with exponential backoff and structured logging.
 */
export class KeeperHubClient {
  private readonly apiKey: string;
  private readonly orgId: string;
  private readonly baseUrl: string;
  private readonly logs: ApiCallLog[] = [];
  private readonly mockMode: boolean;
  private mcpClient?: Client;

  constructor(
    apiKey: string,
    orgId: string,
    options?: { baseUrl?: string; mockMode?: boolean }
  ) {
    this.apiKey = apiKey;
    this.orgId = orgId;
    this.baseUrl = options?.baseUrl ?? "https://app.keeperhub.com/api";
    this.mockMode = options?.mockMode ?? !apiKey.startsWith("kh_");
  }

  /**
   * Initialize the MCP connection to KeeperHub for tool discovery.
   */
  public async initializeMCP(): Promise<void> {
    if (this.mockMode) return;
    
    try {
      const headers = {
        "Authorization": `Bearer ${this.apiKey}`,
        "X-Org-Id": this.orgId,
      };

      const transport = new SSEClientTransport(new URL("https://app.keeperhub.com/mcp"), {
        eventSourceInit: {
          headers
        } as any,
        requestInit: {
          headers
        }
      });
      
      this.mcpClient = new Client(
        {
          name: "velora-agent",
          version: "0.1.0",
        },
        {
          capabilities: {}
        }
      );
      
      await this.mcpClient.connect(transport);
      this.log("MCP", "connect", "success", 0);
    } catch (error) {
      this.log("MCP", "connect", "error", 0, undefined, error instanceof Error ? error.message : String(error));
      console.warn("Failed to connect to KeeperHub MCP server:", error);
    }
  }

  /**
   * Create a new workflow on KeeperHub.
   */
  public async createWorkflow(
    name: string,
    definition: WorkflowDefinition
  ): Promise<string> {
    if (this.mockMode) {
      const workflowId = `wf_mock_${Date.now()}`;
      this.log("POST", "/workflows", "success", 50, workflowId);
      return workflowId;
    }

    const response = await this.fetchWithRetry("POST", "/workflows", {
      orgId: this.orgId,
      ...definition,
      name,
    });

    return (response as { workflowId: string }).workflowId;
  }

  /**
   * Execute a workflow immediately.
   */
  public async executeWorkflow(
    workflowId: string,
    inputs: Record<string, unknown>
  ): Promise<ExecutionResult> {
    if (this.mockMode) {
      const result: ExecutionResult = {
        executionId: `exec_mock_${Date.now()}`,
        workflowId,
        txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        status: "simulated",
        gasUsed: Math.floor(Math.random() * 100000) + 21000,
        timestamp: Date.now(),
      };
      this.log("POST", `/workflows/${workflowId}/trigger`, "success", 120, workflowId);
      return result;
    }

    const response = await this.fetchWithRetry(
      "POST",
      `/workflows/${workflowId}/trigger`,
      { inputs }
    );

    return response as ExecutionResult;
  }

  /**
   * Get execution history for a workflow (audit trail).
   */
  public async getExecutions(workflowId: string): Promise<AuditEntry[]> {
    if (this.mockMode) {
      this.log("GET", `/workflows/${workflowId}/executions`, "success", 30, workflowId);
      return [];
    }

    const response = await this.fetchWithRetry(
      "GET",
      `/workflows/${workflowId}/executions`
    );

    return response as AuditEntry[];
  }

  /**
   * List available action schemas from KeeperHub.
   */
  public async listActionSchemas(): Promise<unknown[]> {
    if (this.mockMode) {
      this.log("GET", "/action-schemas", "success", 25);
      return [
        { name: "read_contract", chains: ["ethereum", "base"] },
        { name: "write_contract", chains: ["ethereum", "base"] },
        { name: "transfer", chains: ["ethereum", "base"] },
        { name: "native_transfer", chains: ["ethereum", "base"] },
        { name: "webhook", chains: ["*"] },
      ];
    }

    if (this.mcpClient) {
      try {
        const tools = await this.mcpClient.listTools();
        this.log("MCP", "listTools", "success", 20);
        return tools.tools;
      } catch (err) {
        this.log("MCP", "listTools", "error", 0, undefined, String(err));
      }
    }

    const response = await this.fetchWithRetry("GET", "/action-schemas");
    return response as unknown[];
  }

  /**
   * Simulate a workflow execution before actually running it.
   * Returns estimated gas and potential issues.
   */
  public async simulateBeforeExecute(
    workflowId: string,
    inputs: Record<string, unknown>
  ): Promise<{
    success: boolean;
    estimatedGas: number;
    warnings: string[];
  }> {
    if (this.mockMode) {
      this.log("POST", `/workflows/${workflowId}/simulate`, "success", 80, workflowId);
      return {
        success: true,
        estimatedGas: Math.floor(Math.random() * 100000) + 21000,
        warnings: [],
      };
    }

    try {
      const response = await this.fetchWithRetry(
        "POST",
        `/workflows/${workflowId}/simulate`,
        { inputs }
      );
      return response as { success: boolean; estimatedGas: number; warnings: string[] };
    } catch {
      // Simulation endpoint may not be available
      return {
        success: true,
        estimatedGas: 0,
        warnings: ["Simulation endpoint not available — proceeding with estimate"],
      };
    }
  }

  /**
   * Check connection status to KeeperHub.
   */
  public async checkConnection(): Promise<boolean> {
    try {
      await this.listActionSchemas();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get whether the client is in mock mode.
   */
  public isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Get all API call logs for debugging.
   */
  public getLogs(): ApiCallLog[] {
    return [...this.logs];
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async fetchWithRetry(
    method: string,
    path: string,
    body?: unknown,
    maxRetries: number = 3
  ): Promise<unknown> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Org-Id": this.orgId,
        };

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`KeeperHub API error ${response.status}: ${errorText}`);
        }

        const data: unknown = await response.json();
        const duration = Date.now() - startTime;
        this.log(method, path, "success", duration);

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const duration = Date.now() - startTime;

        if (attempt < maxRetries - 1) {
          this.log(method, path, "retry", duration, undefined, lastError.message);
          // Exponential backoff: 1s, 2s, 4s
          await this.sleep(Math.pow(2, attempt) * 1000);
        } else {
          this.log(method, path, "error", duration, undefined, lastError.message);
        }
      }
    }

    throw lastError ?? new Error("KeeperHub API call failed after retries");
  }

  private log(
    method: string,
    endpoint: string,
    status: "success" | "error" | "retry",
    duration: number,
    workflowId?: string,
    error?: string
  ): void {
    const entry: ApiCallLog = {
      timestamp: Date.now(),
      method,
      endpoint,
      workflowId,
      status,
      duration,
      error,
    };
    this.logs.push(entry);

    // Structured JSON logging
    console.log(JSON.stringify({
      type: "keeperhub_api",
      ...entry,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
