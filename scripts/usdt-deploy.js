const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  if (hre.network.name === "mainnet") {
    console.log("Deploying USDT to mainnet. Hit ctrl + c to abort");
  }

  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const USDT = await ethers.getContractFactory("USDT");
  const usdt = await USDT.deploy();

  await usdt.deployed();

  console.log("USDT address:", usdt.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
