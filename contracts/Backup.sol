// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

contract Backup {
    function getOrderProceeds(uint256 orderId)
        external
        view
        returns (uint256 withdrawableProceeds);

    ///@notice returns the user order withdrawable proceeds
    function getOrderProceeds(uint256 orderId)
        external
        view
        override
        returns (uint256 withdrawableProceeds)
    {
        address orderSellToken = longTermOrders.orderMap[orderId].sellTokenId;
        uint256 orderExpiry = longTermOrders.orderMap[orderId].expirationBlock;
        uint256 orderSaleRate = longTermOrders.orderMap[orderId].saleRate;

        uint256 orderRewardFactorAtSubmission = longTermOrders
            .OrderPoolMap[orderSellToken]
            .rewardFactorAtSubmission[orderId];
        uint256 orderRewardFactorAtExpiry = longTermOrders
            .OrderPoolMap[orderSellToken]
            .rewardFactorAtBlock[orderExpiry];
        uint256 poolRewardFactor = longTermOrders
            .OrderPoolMap[orderSellToken]
            .rewardFactor;

        if (block.number >= orderExpiry) {
            withdrawableProceeds = (orderRewardFactorAtExpiry -
                orderRewardFactorAtSubmission)
                .mul(orderSaleRate.fromUint())
                .toUint();
        }
        //if order has not yet expired, we just adjust the start
        else {
            withdrawableProceeds = (poolRewardFactor -
                orderRewardFactorAtSubmission)
                .mul(orderSaleRate.fromUint())
                .toUint();
        }
    }

    function getTWAMMRewardFactorAtBlock(uint256 blockNumber)
        external
        view
        returns (
            uint256 orderPoolARewardFactorAtBlock,
            uint256 orderPoolBRewardFactorAtBlock
        );

    ///@notice returns reward factor at a specific block
    function getTWAMMRewardFactorAtBlock(uint256 blockNumber)
        external
        view
        override
        returns (
            uint256 orderPoolARewardFactorAtBlock,
            uint256 orderPoolBRewardFactorAtBlock
        )
    {
        orderPoolARewardFactorAtBlock = longTermOrders
            .OrderPoolMap[tokenA]
            .rewardFactorAtBlock[blockNumber];

        orderPoolBRewardFactorAtBlock = longTermOrders
            .OrderPoolMap[tokenB]
            .rewardFactorAtBlock[blockNumber];
    }
}
