// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

library Oracle {
    struct Observation {
        uint32 blockTimestampLast;
        uint256 price0CumulativeLast;
        uint256 price1CumulativeLast;
    }
}

mapping(uint32 => OracleObservation) public OracleObservationHistory;

// update price accumulators, on the first call per block
    function updatePrice(uint256 reserveA, uint256 reserveB) private {
        require(
            reserveA <= type(uint112).max && reserveB <= type(uint112).max,
            "Pair: Overflow"
        );
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if (timeElapsed > 0 && reserveA != 0 && reserveB != 0) {
            // * never overflows, and + overflow is desired
            OracleObservationHistory[blockTimestamp] = OracleObservation(
                timeElapsed,
                OracleObservationHistory[blockTimestampLast]
                    .priceACumulativeLast +
                    uint256(
                        UQ112x112.encode(uint112(reserveB)).uqdiv(
                            uint112(reserveA)
                        )
                    ) *
                    timeElapsed,
                OracleObservationHistory[blockTimestampLast]
                    .priceBCumulativeLast =
                    uint256(
                        UQ112x112.encode(uint112(reserveA)).uqdiv(
                            uint112(reserveB)
                        )
                    ) *
                    timeElapsed
            );
        }