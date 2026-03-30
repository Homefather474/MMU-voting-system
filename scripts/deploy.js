/**
 * Deployment script for VotingSystem smart contract
 * Usage: npx hardhat run scripts/deploy.js --network ganache
 */
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying VotingSystem Smart Contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("  Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("  Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy VotingSystem contract
  const electionTitle = "MMUSG Presidential Election 2026";
  const electionDescription = "Annual Multimedia University Student Government Presidential Election";

  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystem.deploy(electionTitle, electionDescription);
  await votingSystem.waitForDeployment();

  const contractAddress = await votingSystem.getAddress();
  
  console.log("  ✅ VotingSystem deployed to:", contractAddress);
  console.log("  📋 Election Title:", electionTitle);
  console.log("  📋 Election Description:", electionDescription);

  // Verify deployment
  const info = await votingSystem.getElectionInfo();
  console.log("\n  📊 Contract State:");
  console.log("     Title:", info[0]);
  console.log("     Status:", ["NotStarted", "Registration", "Voting", "Ended", "ResultsPublished"][Number(info[2])]);
  console.log("     Candidates:", info[3].toString());
  console.log("     Registered Voters:", info[4].toString());
  console.log("     Votes Cast:", info[5].toString());

  console.log("\n══════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("  Contract Address:", contractAddress);
  console.log("  Update your .env file:");
  console.log(`  CONTRACT_ADDRESS=${contractAddress}`);
  console.log("══════════════════════════════════════════\n");

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
