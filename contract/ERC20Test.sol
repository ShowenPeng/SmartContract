// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";

contract ERC20Test is ERC20 {
    constructor(uint256 supply) ERC20("ERC20Test Token", "ERC") {
        _mint(msg.sender, supply * 10**18);
    }

    function testBurn(address to, uint256 value) external {
        _burn(to, value);
    }

    function testMint(address to, uint256 value) external {
        _mint(to, value);
    }
}
