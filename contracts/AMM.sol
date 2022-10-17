// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";
import "https://github.com/paulrberg/prb-math/blob/main/contracts/PRBMathUD60x18.sol";

contract AMM is ERC20 {
    using PRBMathUD60x18 for uint256;

    /// ---------------------------
    /// ------ AMM Parameters -----
    /// ---------------------------

    ///@notice tokens that can be traded in the AMM
    address public tokenA;
    address public tokenB;

    ///@notice fee for LP providers, 4 decimal places, i.e. 30 = 0.3%
    uint256 public constant LP_FEE = 30;

    ///@notice map token addresses to current amm reserves
    mapping(address => uint256) reserveMap;

    /// ---------------------------
    /// --------- Events ----------
    /// ---------------------------

    ///@notice An event emitted when initial liquidity is provided
    event InitialLiquidityProvided(
        address indexed addr,
        uint256 amountA,
        uint256 amountB
    );

    ///@notice An event emitted when liquidity is provided
    event LiquidityProvided(address indexed addr, uint256 lpTokens);

    ///@notice An event emitted when liquidity is removed
    event LiquidityRemoved(address indexed addr, uint256 lpTokens);

    ///@notice An event emitted when a swap from tokenA to tokenB is performed
    event SwapAToB(address indexed addr, uint256 amountAIn, uint256 amountBOut);

    ///@notice An event emitted when a swap from tokenB to tokenA is performed
    event SwapBToA(address indexed addr, uint256 amountBIn, uint256 amountAOut);

    constructor(address _tokenA, address _tokenB) ERC20("AMM-LP", "AMM-LP") {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    ///@notice provide initial liquidity to the amm. This sets the relative price between tokens
    function provideInitialLiquidity(uint256 amountA, uint256 amountB)
        external
    {
        require(
            totalSupply() == 0,
            "liquidity has already been provided, need to call provideLiquidity"
        );

        ERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        ERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        reserveMap[tokenA] = amountA;
        reserveMap[tokenB] = amountB;

        //initial LP amount is the geometric mean of supplied tokens
        uint256 lpAmount = amountA
            .fromUint()
            .sqrt()
            .mul(amountB.fromUint().sqrt())
            .toUint();
        _mint(msg.sender, lpAmount);

        emit InitialLiquidityProvided(msg.sender, amountA, amountB);
    }

    ///@notice provide liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to mint with new liquidity
    function provideLiquidity(uint256 lpTokenAmount) external {
        require(
            totalSupply() != 0,
            "no liquidity has been provided yet, need to call provideInitialLiquidity"
        );

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after mint
        uint256 amountAIn = (lpTokenAmount * reserveMap[tokenA]) /
            totalSupply();
        uint256 amountBIn = (lpTokenAmount * reserveMap[tokenB]) /
            totalSupply();

        ERC20(tokenA).transferFrom(msg.sender, address(this), amountAIn);
        ERC20(tokenB).transferFrom(msg.sender, address(this), amountBIn);

        reserveMap[tokenA] += amountAIn;
        reserveMap[tokenB] += amountBIn;

        _mint(msg.sender, lpTokenAmount);

        emit LiquidityProvided(msg.sender, lpTokenAmount);
    }

    ///@notice remove liquidity to the AMM
    ///@param lpTokenAmount number of lp tokens to burn
    function removeLiquidity(uint256 lpTokenAmount) external {
        require(
            lpTokenAmount <= totalSupply(),
            "not enough lp tokens available"
        );

        //the ratio between the number of underlying tokens and the number of lp tokens must remain invariant after burn
        uint256 amountAOut = (reserveMap[tokenA] * lpTokenAmount) /
            totalSupply();
        uint256 amountBOut = (reserveMap[tokenB] * lpTokenAmount) /
            totalSupply();

        ERC20(tokenA).transfer(msg.sender, amountAOut);
        ERC20(tokenB).transfer(msg.sender, amountBOut);

        reserveMap[tokenA] -= amountAOut;
        reserveMap[tokenB] -= amountBOut;

        _burn(msg.sender, lpTokenAmount);

        emit LiquidityRemoved(msg.sender, lpTokenAmount);
    }

    ///@notice swap a given amount of TokenA against embedded amm
    function swapFromAToB(uint256 amountAIn) external {
        uint256 amountBOut = performSwap(tokenA, tokenB, amountAIn);
        emit SwapAToB(msg.sender, amountAIn, amountBOut);
    }

    ///@notice swap a given amount of TokenB against embedded amm
    function swapFromBToA(uint256 amountBIn) external {
        uint256 amountAOut = performSwap(tokenB, tokenA, amountBIn);
        emit SwapBToA(msg.sender, amountBIn, amountAOut);
    }

    ///@notice private function which implements swap logic
    function performSwap(
        address from,
        address to,
        uint256 amountIn
    ) private returns (uint256 amountOutMinusFee) {
        require(amountIn > 0, "swap amount must be positive");

        //constant product formula
        uint256 amountOut = (reserveMap[to] * amountIn) /
            (reserveMap[from] + amountIn);
        //charge LP fee
        amountOutMinusFee = (amountOut * (10000 - LP_FEE)) / 10000;

        ERC20(from).transferFrom(msg.sender, address(this), amountIn);
        ERC20(to).transfer(msg.sender, amountOutMinusFee);

        reserveMap[from] += amountIn;
        reserveMap[to] -= amountOutMinusFee;
    }

    ///@notice get tokenA reserves
    function tokenAReserves() public view returns (uint256) {
        return reserveMap[tokenA];
    }

    ///@notice get tokenB reserves
    function tokenBReserves() public view returns (uint256) {
        return reserveMap[tokenB];
    }
}
