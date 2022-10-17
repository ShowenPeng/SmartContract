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
  let cDenominator = c1.add(c2);
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
    require(tokenAOut.gte(BigNumber(0)) && tokenBOut.get(BigNumber(0)));
  }
  return [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB];
}
