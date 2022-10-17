import { BigNumber } from '@ethersproject/bignumber'
import bn from 'bignumber.js'
const hre = require("hardhat");
const ethers = hre.ethers;
const bigZero = new bn(0);

// const bigFour = new bn(4);

function sqrt(value: BigNumber): BigNumber {
    return BigNumber.from(new bn(value.toString()).sqrt().toFixed().split('.')[0])
}


function computeC(
    tokenAStart: BigNumber,
    tokenBStart: BigNumber,
    tokenAIn: BigNumber,
    tokenBIn: BigNumber
) {
    let c1 = sqrt(tokenAStart).mul(sqrt(tokenBIn));
    let c2 = sqrt(tokenBStart).mul(sqrt(tokenAIn));
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
    let eNumerator = sqrt(tokenAIn.mul(4)).mul(sqrt(tokenBIn));
    let eDenominator = sqrt(tokenAStart).mul(sqrt(tokenBStart));
    let exponent = (eNumerator.div(eDenominator)).exp();
    require(exponent.gt(c.abs()));
    let fraction = (exponent.add(c)).div(exponent.sub(c));
    let scaling = sqrt(k.div(tokenBIn)).mul(sqrt(tokenAIn));
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
        tokenAOut = bigZero;
        tokenBOut = bigZero;
        ammEndTokenA = tokenAStart;
        ammEndTokenB = tokenBStart;
    }
    //in the case where only one pool is selling, we just perform a normal swap
    else if (tokenAIn.isZero()) {
        //constant product formula
        tokenAOut = tokenAStart.mul(tokenBIn).div(tokenBStart.add(tokenBIn));
        tokenBOut = bigZero;
        ammEndTokenA = tokenAStart.sub(tokenAOut);
        ammEndTokenB = tokenBStart.add(tokenBIn);
    } else if (tokenBIn.isZero()) {
        tokenAOut = bigZero;
        //constant product formula
        tokenBOut = (tokenBStart.mul(tokenAIn)).div(tokenAStart.add(tokenAIn));
        ammEndTokenA = tokenAStart.add(tokenAIn);
        ammEndTokenB = tokenBStart.add(tokenBOut);
    }
    //when both pools sell, we use the TWAMM formula
    else {
        let k = tokenAStart.mul(tokenBStart);
        let c = computeC(tokenAStart, tokenBStart, tokenAIn, tokenBIn);
        let endA = computeAmmEndTokenA(tokenAIn, tokenBIn, c, k, tokenAStart, tokenBStart);
        let endB = tokenAStart.mul(tokenBStart).div(endA);

        let outA = tokenAStart.add(tokenAIn).sub(endA);
        let outB = tokenBStart.add(tokenBIn).sub(endB);
        require(outA.gte(bigZero) && outB.gte(bigZero));
        return [
            outA,
            outB,
            endA,
            endB
        ];
    }
    return [
        tokenAOut,
        tokenBOut,
        ammEndTokenA,
        ammEndTokenB
    ]
}

async function executeVirtualOrders(blockNumber: number) {
    const token0Addr = "0xb0751fACbCcF598787c351Ce9541a4b203504c41";
    const token0 = await ethers.getContractAt("ERC20Mock", token0Addr);
    const token1Addr = "0x419E14a156daA5159ad73D36313E3520ff2a3F57";
    const token1 = await ethers.getContractAt("ERC20Mock", token1Addr);
    // loading necessary contracts
    const TWAMMAddr = "0xFe2E5fCe86495560574270f1F97a5ce9f534Cf94";
    const twamm = await ethers.getContractAt("TWAMM", TWAMMAddr);

    const TWAMMLiquidityAddr = "0x470C1F6F472f4ec19de25A467327188b5de96308";
    const twammLiquidity = await ethers.getContractAt(
        "TWAMMLiquidity",
        TWAMMLiquidityAddr
    );

    const TWAMMInstantSwapAddr = "0xf382E6ff0cE929FA5F10DBBD006213e7E1D14F53";
    const twammInstantSwap = await ethers.getContractAt(
        "TWAMMInstantSwap",
        TWAMMInstantSwapAddr
    );

    const TWAMMTermSwapAddr = "0x6c859b445695E216e348A75287B453A2329F391F";
    const twammTermSwap = await ethers.getContractAt(
        "TWAMMTermSwap",
        TWAMMTermSwapAddr
    );

    const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
    console.log("pair address check", pairAddr);

    let pair = await ethers.getContractAt("Pair", pairAddr);

    //variables
    let orderBlockInterval = 5;

    // let tokenA;
    // let tokenB;

    let reserveA;
    let reserveB;
    let i;

    let lastVirtualOrderBlock: number;
    let currentSalesRateA: BigNumber;
    let currentSalesRateB: BigNumber;
    let rewardFactorA: BigNumber;
    let rewardFactorB: BigNumber;

    //get the variable value through the view function
    reserveA = await pair.tokenAReserves();
    reserveB = await pair.tokenBReserves();
    [lastVirtualOrderBlock, currentSalesRateA, currentSalesRateB, rewardFactorA, rewardFactorB] = await pair.getTWAMMState();

    //execute virtual order settlement to blockNumber
    let lastExpiryBlock = lastVirtualOrderBlock - (lastVirtualOrderBlock % orderBlockInterval)
    let n = (blockNumber - lastExpiryBlock) % orderBlockInterval;

    if (n >= 1) {
        for (i = 1; i <= n; i++) {
            let iExpiryBlock = lastExpiryBlock + i * orderBlockInterval;
            let [iOrderPoolASalesRateEnding, iOrderPoolBSalesRateEnding] = await pair.getTWAMMSalesRateEnding(iExpiryBlock);

            if (iOrderPoolASalesRateEnding.gt(bigZero) || iOrderPoolASalesRateEnding.gt(bigZero)) {
                //amount sold from virtual trades
                let blockNumberIncrement = iExpiryBlock - lastVirtualOrderBlock;
                // let bigBlockNumberIncrement = new bn(blockNumberIncrement);
                let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
                let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

                //updated balances from sales
                let [tokenAOut,
                    tokenBOut,
                    ammEndTokenA,
                    ammEndTokenB
                ] = computeVirtualBalances(
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

                if (!currentSalesRateA.eq(bigZero)) { rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA)); }
                if (!currentSalesRateB.eq(bigZero)) { rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB)); }
            }
            //finally, move state to blockNumber if necessary
            let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] = await pair.getTWAMMSalesRateEnding(blockNumber);
            let blockNumberIncrement = blockNumber - lastVirtualOrderBlock;
            let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
            let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

            let [
                tokenAOut,
                tokenBOut,
                ammEndTokenA,
                ammEndTokenB
            ] = computeVirtualBalances(
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

            if (!currentSalesRateA.eq(bigZero)) { rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA)); }
            if (!currentSalesRateB.eq(bigZero)) { rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB)); }

        }

    } else {
        let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] = await pair.getTWAMMSalesRateEnding(blockNumber);
        let blockNumberIncrement = blockNumber - lastVirtualOrderBlock;
        let tokenASellAmount = currentSalesRateA.sub(blockNumberIncrement);
        let tokenBSellAmount = currentSalesRateB.sub(blockNumberIncrement);

        let [
            tokenAOut,
            tokenBOut,
            ammEndTokenA,
            ammEndTokenB
        ] = computeVirtualBalances(
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

        if (!currentSalesRateA.eq(bigZero)) { rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA)); }
        if (!currentSalesRateB.eq(bigZero)) { rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB)); }
    }
}