import "./execute-compute.ts";
import { BigNumber } from "@ethersproject/bignumber";

const hre = require("hardhat");
const ethers = hre.ethers;

const orderBlockInterval = 5;

let tokenA;
let tokenB;

let reserveA;
let reserveB;

let lastVirtualOrderBlock;
let currentSalesRateA;
let currentSalesRateB;
let rewardFactorA;
let rewardFactorB;

// let withdrawableProceeds;
// let orderRewardFactorAtSubmission;

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  const token0Addr = "0xb0751fACbCcF598787c351Ce9541a4b203504c41";
  const token1Addr = "0x419E14a156daA5159ad73D36313E3520ff2a3F57";

  const tokenAAddr = token0Addr < token1Addr ? token0Addr : token1Addr;
  const tokenBAddr = token0Addr < token1Addr ? token1Addr : token0Addr;

  tokenA = await ethers.getContractAt("ERC20Mock", tokenAAddr);
  tokenB = await ethers.getContractAt("ERC20Mock", tokenBAddr);

  // loading necessary contracts
  const TWAMMAddr = "0xFe2E5fCe86495560574270f1F97a5ce9f534Cf94";
  const twamm = await ethers.getContractAt("ITWAMM", TWAMMAddr);

  // const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  let currentBlockNumber = await ethers.provider.getBlockNumber();
  console.log("current block number", currentBlockNumber);

  const pairAddr = await twamm.obtainPairAddress(tokenAAddr, tokenBAddr);
  console.log("pair address check", pairAddr);
  let pair = await ethers.getContractAt("Pair", pairAddr);

  reserveA = await pairContract.tokenAReserves();
  console.log("tokenAReserve", reserveA);
  reserveB = await pairContract.tokenBReserves();
  console.log("tokenBReserve", reserveB);

  [
    lastVirtualOrderBlock,
    currentSalesRateA,
    currentSalesRateB,
    rewardFactorA,
    rewardFactorB,
  ] = await pair.getTWAMMState();

  //execute virtual order settlement to currentBlockNumber
  let lastExpiryBlock =
    lastVirtualOrderBlock - (lastVirtualOrderBlock % orderBlockInterval);
  let n = (currentBlockNumber - lastExpiryBlock) % orderBlockInterval;

  if (n >= 1) {
    for (i = 1; i <= n; i++) {
      let iExpiryBlock = lastExpiryBlock + i * orderBlockInterval;
      let [iOrderPoolASalesRateEnding, iOrderPoolBSalesRateEnding] =
        await pair.getTWAMMSalesRateEnding(iExpiryBlock);

      if (
        iOrderPoolASalesRateEnding.gt(BigNumber(0)) ||
        iOrderPoolASalesRateEnding.gt(BigNumber(0))
      ) {
        //amount sold from virtual trades
        let blockNumberIncrement = iExpiryBlock - lastVirtualOrderBlock;
        let tokenASellAmount = currentSalesRateA.mul(
          BigNumber(blockNumberIncrement)
        );
        let tokenBSellAmount = currentSalesRateB.mul(
          BigNumber(blockNumberIncrement)
        );

        //updated balances from sales
        let [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] =
          computeVirtualBalances(
            reserveA,
            reserveB,
            tokenASellAmount,
            tokenBSellAmount
          );

        //update state
        reserveA = ammEndTokenA;
        reserveB = ammEndTokenB;

        lastVirtualOrderBlock = iExpiryBlock;
        currentSalesRateA = currentSalesRateA.sub(iOrderPoolASalesRateEnding);
        currentSalesRateB = currentSalesRateB.sub(iOrderPoolBSalesRateEnding);

        if (!currentSalesRateA.eq(BigNumber(0))) {
          rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA));
        }
        if (!currentSalesRateB.eq(BigNumber(0))) {
          rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB));
        }
      }

      //finally, move state to currentBlockNumber if necessary
      let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] =
        await pair.getTWAMMSalesRateEnding(currentBlockNumber);
      let blockNumberIncrement = currentBlockNumber - lastVirtualOrderBlock;
      let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
      let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

      let [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] =
        computeVirtualBalances(
          reserveA,
          reserveB,
          tokenASellAmount,
          tokenBSellAmount
        );

      //update state
      reserveA = ammEndTokenA;
      reserveB = ammEndTokenB;

      lastVirtualOrderBlock = blockNumber;
      currentSalesRateA = currentSalesRateA.sub(endOrderPoolASalesRateEnding);
      currentSalesRateB = currentSalesRateB.sub(endOrderPoolBSalesRateEnding);

      if (!currentSalesRateA.eq(BigNumber(0))) {
        rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA));
      }
      if (!currentSalesRateB.eq(BigNumber(0))) {
        rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB));
      }
    }
  } else {
    let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] =
      await pair.getTWAMMSalesRateEnding(blockNumber);
    let blockNumberIncrement = blockNumber - lastVirtualOrderBlock;
    let tokenASellAmount = currentSalesRateA.sub(blockNumberIncrement);
    let tokenBSellAmount = currentSalesRateB.sub(blockNumberIncrement);

    let [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] =
      computeVirtualBalances(
        reserveA,
        reserveB,
        tokenASellAmount,
        tokenBSellAmount
      );

    //update state
    reserveA = ammEndTokenA;
    reserveB = ammEndTokenB;

    lastVirtualOrderBlock = blockNumber;
    currentSalesRateA = currentSalesRateA.sub(endOrderPoolASalesRateEnding);
    currentSalesRateB = currentSalesRateB.sub(endOrderPoolBSalesRateEnding);

    if (!currentSalesRateA.eq(BigNumber(0))) {
      rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA));
    }
    if (!currentSalesRateB.eq(BigNumber(0))) {
      rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB));
    }
  }

  // await sleep(10000);
  // console.log("get order Ids");
  // let orderIds = await pair.userIdsCheck(account.getAddress());
  // console.log("ids before order submission", orderIds);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
