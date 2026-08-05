import type { DetectedEvent } from "@velora/core";

const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

/** Sample malicious/suspicious addresses for mock events */
const MOCK_SPENDERS = [
  "0xDEADBEEF00000000000000000000000000000001",
  "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap (known — should score lower)
  "0xBADBADBAD0000000000000000000000000000002",
  "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch (known)
  "0xSUSPICIOUS000000000000000000000000000003",
];

const MOCK_TOKENS = [
  { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", name: "USDC", decimals: 6 },
  { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", name: "USDT", decimals: 6 },
  { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", name: "WETH", decimals: 18 },
];

const MOCK_SCENARIOS: Array<{
  name: string;
  buildEvent: () => Partial<DetectedEvent>;
}> = [
  {
    name: "Unlimited USDC approval to unknown spender",
    buildEvent: () => ({
      contractAddress: MOCK_TOKENS[0]!.address,
      spender: MOCK_SPENDERS[0],
      amount: MAX_UINT256,
      usdValue: 50000,
      functionSelector: "0x095ea7b3",
      functionName: "approve",
      contractDeployedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    }),
  },
  {
    name: "Large USDT transfer to unknown address",
    buildEvent: () => ({
      contractAddress: MOCK_TOKENS[1]!.address,
      spender: MOCK_SPENDERS[2],
      amount: "25000000000",
      usdValue: 25000,
      functionSelector: "0xa9059cbb",
      functionName: "transfer",
    }),
  },
  {
    name: "Legitimate Uniswap approval",
    buildEvent: () => ({
      contractAddress: MOCK_TOKENS[0]!.address,
      spender: MOCK_SPENDERS[1], // Uniswap — known protocol
      amount: "1000000000",
      usdValue: 1000,
      functionSelector: "0x095ea7b3",
      functionName: "approve",
    }),
  },
  {
    name: "Suspicious setApprovalForAll on new contract",
    buildEvent: () => ({
      contractAddress: "0xNEWCONTRACT0000000000000000000000000001",
      spender: MOCK_SPENDERS[4],
      functionSelector: "0xa22cb465",
      functionName: "setApprovalForAll",
      contractDeployedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    }),
  },
  {
    name: "Normal 1inch swap",
    buildEvent: () => ({
      contractAddress: MOCK_TOKENS[2]!.address,
      spender: MOCK_SPENDERS[3], // 1inch — known protocol
      amount: "500000000000000000",
      usdValue: 900,
      functionSelector: "0x095ea7b3",
      functionName: "approve",
    }),
  },
];

/**
 * Generate mock detected events for testing and development.
 * Cycles through realistic scenarios covering various threat levels.
 */
export function createMockEvents(
  count: number,
  specificTxHash?: string
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  for (let i = 0; i < count; i++) {
    const scenario = MOCK_SCENARIOS[Math.floor(Math.random() * MOCK_SCENARIOS.length)]!;
    const partialEvent = scenario.buildEvent();

    const txHash =
      specificTxHash ??
      `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    const event: DetectedEvent = {
      txHash,
      chainId: 8453,
      contractAddress: partialEvent.contractAddress ?? MOCK_TOKENS[0]!.address,
      spender: partialEvent.spender,
      amount: partialEvent.amount,
      usdValue: partialEvent.usdValue,
      functionSelector: partialEvent.functionSelector,
      functionName: partialEvent.functionName,
      riskScore: 0,
      timestamp: Date.now(),
      contractDeployedAt: partialEvent.contractDeployedAt,
    };

    events.push(event);
  }

  return events;
}
