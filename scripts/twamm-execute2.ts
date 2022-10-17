import { BigNumber, FixedNumber } from "@ethersproject/bignumber";
import { utils } from "ethers";
import bn from "bignumber.js";
const hre = require("hardhat");
const ethers = hre.ethers;
const { BNM } =require('./bignumberLIB.js');

// const precisionAdjuster = 3
const precisionMultiplier = 10000;

const bigZero = BigNumber.from(0);
// const precisionMultiplier = 1000;

function sqrt(value: BigNumber): BigNumber {
  return BigNumber.from(
    new bn(value.toString()).sqrt().toFixed().split(".")[0]
  );
}

// function computeC(
//   tokenAStart: BigNumber,
//   tokenBStart: BigNumber,
//   tokenAIn: BigNumber,
//   tokenBIn: BigNumber
// ): FixedNumber {
//   let c1 = sqrt(tokenAStart).mul(sqrt(tokenBIn));
//   let c2 = sqrt(tokenBStart).mul(sqrt(tokenAIn));
//   let cNumerator = c1.sub(c2);
//   let cNumeratorFixed = FixedNumber.fromValue(cNumerator);
//   let cDenominator = c1.add(c2);
//   let cDenominatorFixed = FixedNumber.fromValue(cDenominator);
//   let c = cNumeratorFixed.divUnsafe(cDenominatorFixed);
//   return c;
// }

// function computeAmmEndTokenA(
//   tokenAIn: BigNumber,
//   tokenBIn: BigNumber,
//   c: FixedNumber,
//   k: BigNumber,
//   tokenAStart: BigNumber,
//   tokenBStart: BigNumber
// ): BigNumber {
//   let eNumerator = sqrt(tokenAIn.mul(4)).mul(sqrt(tokenBIn));
//   let eDenominator = sqrt(tokenAStart).mul(sqrt(tokenBStart));
//   let exponent = FixedNumber.from(
//     Number.parseFloat(
//       Math.exp(eNumerator.div(eDenominator).toNumber()) + ""
//     ).toFixed(18)
//   );
//   console.log('exponent', exponent.toString(), eNumerator.toString(), eDenominator.toString());
//   let fraction = exponent.addUnsafe(c).divUnsafe(exponent.subUnsafe(c));
//   console.log('fraction', fraction.toString());
//   let scaling = FixedNumber.from(
//     sqrt(k.div(tokenBIn)).mul(sqrt(tokenAIn)).toString()
//   );
//   let ammEndTokenA = fraction.mulUnsafe(scaling);
//   return BigNumber.from(
//     ammEndTokenA.toString().substring(0, ammEndTokenA.toString().indexOf("."))
//   );
// }

function computeC(
  tokenAStart: BigNumber,
  tokenBStart: BigNumber,
  tokenAIn: BigNumber,
  tokenBIn: BigNumber
): any {
  let c1 = (new BNM(tokenAStart.toString())).sqrt().multipliedBy((new BNM(tokenBIn.toString())).sqrt())//sqrt(tokenAStart).mul(sqrt(tokenBIn));
  let c2 = (new BNM(tokenBStart.toString())).sqrt().multipliedBy((new BNM(tokenAIn.toString())).sqrt())//sqrt(tokenBStart).mul(sqrt(tokenAIn));
  let cNumerator = c1.minus(c2);
  let cDenominator = c1.plus(c2);
  let c = cNumerator.dividedBy(cDenominator);

  return c;
}

// function computeAmmEndTokenA(
//   tokenAIn: BigNumber,
//   tokenBIn: BigNumber,
//   c: BigNumber,
//   k: BigNumber,
//   tokenAStart: BigNumber,
//   tokenBStart: BigNumber
// ): BigNumber {
//   let eNumerator = sqrt(tokenAIn.mul(4)).mul(sqrt(tokenBIn));
//   let eDenominator = sqrt(tokenAStart).mul(sqrt(tokenBStart));
//   let exponent = BigNumber.from(
//     Math.exp(eNumerator.mul(10000).div(eDenominator.mul(10000)).toNumber())
//   );
//   let fraction = exponent.add(c).mul(10000).div(exponent.sub(c).mul(10000));
//   let scaling = sqrt(k.mul(10000).div(tokenBIn.mul(10000))).mul(sqrt(tokenAIn));
//   let ammEndTokenA = fraction.mul(scaling);
//   return ammEndTokenA;
// }

function computeAmmEndTokenA(
  tokenAIn: BigNumber,
  tokenBIn: BigNumber,
  c: any,
  k: BigNumber,
  tokenAStart: BigNumber,
  tokenBStart: BigNumber
): BigNumber {
  let eNumeratorNew = (new BNM(tokenAIn.toString())).sqrt().multipliedBy(2).multipliedBy(new BNM(tokenBIn.toString()).sqrt())
  let eDenominatorNew = (new BNM(tokenAStart.toString())).sqrt().multipliedBy(new BNM(tokenBStart.toString()).sqrt())
  let exponent = new BNM(
    Math.exp(parseFloat((eNumeratorNew.dividedBy(eDenominatorNew)).toString())).toString()
  );
  let fraction = (exponent.plus(c)).dividedBy(exponent.minus(c));
  let scaling = ((new BNM(k.toString())).dividedBy(new BNM(tokenBIn.toString()))).sqrt().multipliedBy((new BNM(tokenAIn.toString())).sqrt())
  let ammEndTokenA = fraction.multipliedBy(scaling);
  return BigNumber.from(ammEndTokenA.toFixed(0));
}

function computeVirtualBalances(
  tokenAStart: BigNumber,
  tokenBStart: BigNumber,
  tokenAIn: BigNumber,
  tokenBIn: BigNumber
): [BigNumber, BigNumber, BigNumber, BigNumber] {
  let tokenAOut: BigNumber;
  let tokenBOut: BigNumber;
  let ammEndTokenA: BigNumber;
  let ammEndTokenB: BigNumber;

  if (tokenAIn.isZero() || tokenBIn.isZero()) {
    tokenAOut = tokenAStart
      .add(tokenAIn)
      .mul(tokenBIn)
      .div(tokenBStart.add(tokenBIn));
    tokenBOut = tokenBStart
      .add(tokenBIn)
      .mul(tokenAIn)
      .div(tokenAStart.add(tokenAIn));
    ammEndTokenA = tokenAStart.add(tokenAIn).sub(tokenAOut);
    ammEndTokenB = tokenBStart.add(tokenBIn).sub(tokenBOut);
  }
  //when both pools sell, we use the TWAMM formula
  else {
    let k = tokenAStart.mul(tokenBStart);
    let c = computeC(tokenAStart, tokenBStart, tokenAIn, tokenBIn);
    ammEndTokenA = computeAmmEndTokenA(
      tokenAIn,
      tokenBIn,
      c,
      k,
      tokenAStart,
      tokenBStart
    );
    ammEndTokenB = tokenAStart.mul(tokenBStart).div(ammEndTokenA);
    tokenAOut = tokenAStart.add(tokenAIn).sub(ammEndTokenA);
    tokenBOut = tokenBStart.add(tokenBIn).sub(ammEndTokenB);
  }
  return [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB];
}

async function executeVirtualOrders(
  blockNumber: number
): Promise<
  [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber]
> {
  const token0Addr = "0xb0751fACbCcF598787c351Ce9541a4b203504c41";
  const token1Addr = "0x419E14a156daA5159ad73D36313E3520ff2a3F57";

  // loading necessary contracts
  const TWAMMAddr = "0xA159f8606212359B7645d4D39c6175A7e3e19217";
  const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log("pair address check", pairAddr);
  let pair = await ethers.getContractAt("Pair", pairAddr);

  //variables
  let orderBlockInterval = 5;
  let i: number;

  let reserveA: BigNumber;
  let reserveB: BigNumber;

  let lastVirtualOrderBlock: number;
  let currentSalesRateA: BigNumber;
  let currentSalesRateB: BigNumber;
  let rewardFactorA: BigNumber;
  let rewardFactorB: BigNumber;

  //get the variable value through the view function
  reserveA = await pair.tokenAReserves();
  reserveB = await pair.tokenBReserves();

  [
    lastVirtualOrderBlock,
    currentSalesRateA,
    currentSalesRateB,
    rewardFactorA,
    rewardFactorB,
  ] = await pair.getTWAMMState();

  let resLastVirtualOrderBlock = lastVirtualOrderBlock;

  //execute virtual order settlement to blockNumber
  let lastExpiryBlock =
    lastVirtualOrderBlock - (lastVirtualOrderBlock % orderBlockInterval); 
  let n = Math.floor((blockNumber - lastExpiryBlock) / orderBlockInterval);
  // let n = (blockNumber - lastExpiryBlock) % orderBlockInterval;

  if (n >= 1) {
    for (i = 1; i <= n; i++) {
      let iExpiryBlock = lastExpiryBlock + i * orderBlockInterval;
      let [iOrderPoolASalesRateEnding, iOrderPoolBSalesRateEnding] =
        await pair.getTWAMMSalesRateEnding(iExpiryBlock);
        // console.log('checkinside', i, n, lastExpiryBlock, lastVirtualOrderBlock, orderBlockInterval, iExpiryBlock, iOrderPoolASalesRateEnding, iOrderPoolBSalesRateEnding)

      if (
        iOrderPoolASalesRateEnding.gt(bigZero) ||
        iOrderPoolBSalesRateEnding.gt(bigZero)
      ) {
        //amount sold from virtual trades
        let blockNumberIncrement = iExpiryBlock - lastVirtualOrderBlock;
        let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
        let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

        let tokenAOut: BigNumber;
        let tokenBOut: BigNumber;
        let ammEndTokenA: BigNumber;
        let ammEndTokenB: BigNumber;

        //updated balances from sales
        [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] =
          computeVirtualBalances(
            reserveA,
            reserveB,
            tokenASellAmount,
            tokenBSellAmount
          );

        if (!currentSalesRateA.eq(0)) {
          rewardFactorA = rewardFactorA.add(utils.parseUnits(tokenBOut.toString(), 18).div(currentSalesRateA));
        }
        if (!currentSalesRateB.eq(0)) {
          rewardFactorB = rewardFactorB.add(utils.parseUnits(tokenAOut.toString(), 18).div(currentSalesRateB));
        }

        //update state
        reserveA = ammEndTokenA;
        reserveB = ammEndTokenB;

        lastVirtualOrderBlock = iExpiryBlock;
        currentSalesRateA = currentSalesRateA.sub(iOrderPoolASalesRateEnding);
        currentSalesRateB = currentSalesRateB.sub(iOrderPoolBSalesRateEnding);
      }
    }
    //finally, move state to blockNumber if necessary
    let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] =
      await pair.getTWAMMSalesRateEnding(blockNumber);
    let blockNumberIncrement = blockNumber - lastVirtualOrderBlock;
    let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
    let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

    let tokenAOut: BigNumber;
    let tokenBOut: BigNumber;
    let ammEndTokenA: BigNumber;
    let ammEndTokenB: BigNumber;

    [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] = computeVirtualBalances(
      reserveA,
      reserveB,
      tokenASellAmount,
      tokenBSellAmount
    );

    if (!currentSalesRateA.eq(0)) {
      rewardFactorA = rewardFactorA.add(utils.parseUnits(tokenBOut.toString(), 18).div(currentSalesRateA));
    }
    if (!currentSalesRateB.eq(0)) {
      rewardFactorB = rewardFactorB.add(utils.parseUnits(tokenAOut.toString(), 18).div(currentSalesRateB));
    }

    //update state
    reserveA = ammEndTokenA;
    reserveB = ammEndTokenB;

    lastVirtualOrderBlock = blockNumber;
    currentSalesRateA = currentSalesRateA.sub(endOrderPoolASalesRateEnding);
    currentSalesRateB = currentSalesRateB.sub(endOrderPoolBSalesRateEnding);
  } else {
    let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] =
      await pair.getTWAMMSalesRateEnding(blockNumber);
    let blockNumberIncrement = blockNumber - lastVirtualOrderBlock;
    let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
    let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

    let tokenAOut: BigNumber;
    let tokenBOut: BigNumber;
    let ammEndTokenA: BigNumber;
    let ammEndTokenB: BigNumber;

    [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] = computeVirtualBalances(
      reserveA,
      reserveB,
      tokenASellAmount,
      tokenBSellAmount
    );

    if (!currentSalesRateA.eq(0)) {
      rewardFactorA = rewardFactorA.add(utils.parseUnits(tokenBOut.toString(), 18).div(currentSalesRateA));
    }
    if (!currentSalesRateB.eq(0)) {
      rewardFactorB = rewardFactorB.add(utils.parseUnits(tokenAOut.toString(), 18).div(currentSalesRateB));
    }

    //update state
    reserveA = ammEndTokenA;
    reserveB = ammEndTokenB;

    lastVirtualOrderBlock = blockNumber;
    currentSalesRateA = currentSalesRateA.sub(endOrderPoolASalesRateEnding);
    currentSalesRateB = currentSalesRateB.sub(endOrderPoolBSalesRateEnding);
  }
  return [
    reserveA,
    reserveB,
    BigNumber.from(resLastVirtualOrderBlock),
    currentSalesRateA,
    currentSalesRateB,
    rewardFactorA,
    rewardFactorB,
  ];
}

export default executeVirtualOrders;
