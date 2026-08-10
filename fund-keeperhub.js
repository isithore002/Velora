/**
 * Fund the KeeperHub org wallet with Base Sepolia ETH
 * so KeeperHub can execute transactions on our behalf.
 */
const { ethers } = require("ethers");

const RPC_URL = "https://sepolia.base.org";
const PRIVATE_KEY = "f01962b99237d8525781736ca31397756cd1345e01e09ba529a86a8353275f0c";
const KEEPERHUB_ORG_WALLET = "0x38e8d05053651b22545ac4b128a42f643c89f443";
const FUND_AMOUNT = ethers.parseEther("0.001"); // 0.001 ETH for gas

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`Funding KeeperHub org wallet...`);
  console.log(`  From: ${wallet.address}`);
  console.log(`  To:   ${KEEPERHUB_ORG_WALLET}`);
  console.log(`  Amount: ${ethers.formatEther(FUND_AMOUNT)} ETH`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`  Monitored wallet balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < FUND_AMOUNT) {
    console.error(`  ❌ Insufficient balance! Need at least ${ethers.formatEther(FUND_AMOUNT)} ETH`);
    console.error(`  Fund the monitored wallet first: ${wallet.address}`);
    process.exit(1);
  }
  
  const tx = await wallet.sendTransaction({
    to: KEEPERHUB_ORG_WALLET,
    value: FUND_AMOUNT,
  });
  
  console.log(`  📡 TX sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`  ✅ Confirmed in block #${receipt.blockNumber}`);
  
  const newBalance = await provider.getBalance(KEEPERHUB_ORG_WALLET);
  console.log(`  KeeperHub wallet balance: ${ethers.formatEther(newBalance)} ETH`);
}

main().catch(console.error);
