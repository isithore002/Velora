const { ethers } = require("ethers");
require("dotenv").config({ path: "./.env" });

async function main() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env["WSS_RPC_URL"]?.replace("wss://", "https://") ?? "https://sepolia.base.org");
    const wallet = new ethers.Wallet("f01962b99237d8525781736ca31397756cd1345e01e09ba529a86a8353275f0c", provider);
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance));
    
    // Test the mock transaction
    const tx = await wallet.sendTransaction({ to: wallet.address, value: 0 });
    console.log("Mock tx successful:", tx.hash);
  } catch (e) {
    console.error("Failed:", e);
  }
}
main();
