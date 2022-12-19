// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

//import Open Zepplins ERC-20 contract
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

//create a sample token that inherits Open Zepplins ERC-20 contract
contract TokenFaucet is ERC20 {
    uint256 public amountAllowed = 10000 * (10**18);

    //when deploying the token give it a name and symbol
    //specify the amount of tokens minted for the owner
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * (10**18));
    }

    //when you requestTokens address and blocktime+1 day is saved in Time Lock
    mapping(address => uint256) public lockTime;

    //allow users to call the requestTokens function to mint tokens
    function requestTokens(address requestor, uint256 amount) external {
        require(amount <= amountAllowed);
        //perform a few check to make sure function can execute
        require(
            block.timestamp > lockTime[msg.sender],
            "lock time has not expired. Please try again later"
        );

        //mint tokens
        _mint(requestor, amount);

        //updates locktime 1 day from now
        lockTime[msg.sender] = block.timestamp + 1 days;
    }
}
