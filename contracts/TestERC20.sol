// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

contract TestERC20 {
    address public token = 0xb9C8f550dc99D2DF2ebC506CD7Dd9bd60f3C9B94;

    function testTransfer(address to, uint256 value) public {
        IERC20(token).transfer(to, value);
    }

    function testTransferFrom(address to, uint256 value) public {
        IERC20(token).transferFrom(to, address(this), value);
    }
}
