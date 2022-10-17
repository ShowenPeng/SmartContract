import { BigNumber } from "@ethersproject/bignumber";

function computeC(
  tokenAStart: BigNumber,
  tokenBStart: BigNumber,
  tokenAIn: BigNumber,
  tokenBIn: BigNumber
) {
  let c1 = tokenAStart.sqrt().mul(tokenBIn.sqrt());
  let c2 = tokenBStart.sqrt().mul(tokenAIn.sqrt());
  let cNumerator = c1.sub(c2);
  let cDenominator = c1.sub(c2);
  let c = cNumerator.div(cDenominator);
  return c;
}

function computeAmmEndTokenA(
  tokenAIn: BigNumber,
  tokenBIn: BigNumber,
  c: BigNumber,
  k: BigNumber,
  tokenAStart: BigNumber,
  tokenBStart: BigNumber
) {
  let eNumerator = tokenAIn.mul(BigNumber(4)).sqrt().mul(tokenBIn.sqrt());
  let eDenominator = tokenAStart.sqrt().mul(tokenBStart.sqrt());
  let exponent = eNumerator.div(eDenominator).exp();
  require(exponent.gt(c.abs()));
  let fraction = exponent.add(c).div(exponent.sub(c));
  let scaling = k.div(tokenBIn).sqrt().mul(tokenAIn.sqrt());
  let ammEndTokenA = fraction.mul(scaling);
  return ammEndTokenA;
}

function computeVirtualBalances(
  tokenAStart: BigNumber,
  tokenBStart: BigNumber,
  tokenAIn: BigNumber,
  tokenBIn: BigNumber
) {
  let tokenAOut;
  let tokenBOut;
  let ammEndTokenA;
  let ammEndTokenB;
  //if no tokens are sold to the pool, we don't need to execute any orders
  if (tokenAIn.isZero() && tokenBIn.isZero()) {
    tokenAOut = BigNumber(0);
    tokenBOut = BigNumber(0);
    ammEndTokenA = tokenAStart;
    ammEndTokenB = tokenBStart;
  }
  //in the case where only one pool is selling, we just perform a normal swap
  else if (tokenAIn.isZero()) {
    //constant product formula
    tokenAOut = tokenAStart.mul(tokenBIn).div(tokenBStart.add(tokenBIn));
    tokenBOut = BigNumber(0);
    ammEndTokenA = tokenAStart.sub(tokenAOut);
    ammEndTokenB = tokenBStart.add(tokenBIn);
  } else if (tokenBIn.isZero()) {
    tokenAOut = BigNumber(0);
    //constant product formula
    tokenBOut = tokenBStart.mul(tokenAIn).div(tokenAStart.add(tokenAIn));
    ammEndTokenA = tokenAStart.add(tokenAIn);
    ammEndTokenB = tokenBStart.add(tokenBOut);
  }
  //when both pools sell, we use the TWAMM formula
  else {
    let k = tokenAStart.mul(tokenBStart);
    let c = computeC(tokenAStart, tokenBStart, tokenAIn, tokenBIn);
    let endA = computeAmmEndTokenA(
      tokenAIn,
      tokenBIn,
      c,
      k,
      tokenAStart,
      tokenBStart
    );
    let endB = tokenAStart.mul(tokenBStart).div(endA);

    let outA = tokenAStart.add(tokenAIn).sub(endA);
    let outB = tokenBStart.add(tokenBIn).sub(endB);
    require(outA.gte(BigNumber(0)) && outB.get(BigNumber(0)));

    return [outA, outB, endA, endB];
  }
  return [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB];
}

function executeVirtualOrders(blockNumber: number) {
  //variables
  let orderBlockInterval = 5;

  let tokenA;
  let tokenB;

  let reserveA;
  let reserveB;
  let i;

  let lastVirtualOrderBlock: number;
  let currentSalesRateA: BigNumber;
  let currentSalesRateB: BigNumber;
  let rewardFactorA: BigNumber;
  let rewardFactorB: BigNumber;

  //get the variable value through the view function
  reserveA = tokenAReserves();
  reserveB = tokenBReserves();
  [
    lastVirtualOrderBlock,
    currentSalesRateA,
    currentSalesRateB,
    rewardFactorA,
    rewardFactorB,
  ] = getTWAMMState();

  //execute virtual order settlement to blockNumber
  let lastExpiryBlock =
    lastVirtualOrderBlock - (lastVirtualOrderBlock % orderBlockInterval);
  let n = (blockNumber - lastExpiryBlock) % orderBlockInterval;

  if (n >= 1) {
    for (i = 1; i <= n; i++) {
      let iExpiryBlock = lastExpiryBlock + i * orderBlockInterval;
      let [iOrderPoolASalesRateEnding, iOrderPoolBSalesRateEnding] =
        getTWAMMSalesRateEnding(iExpiryBlock);

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

      //finally, move state to blockNumber if necessary
      let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] =
        getTWAMMSalesRateEnding(blockNumber);
      let blockNumberIncrement = blockNumber - lastVirtualOrderBlock;
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
      getTWAMMSalesRateEnding(blockNumber);
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
}
