// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract Logic is Initializable, OwnableUpgradeable {
    function initialize() public initializer {
        __Ownable_init();
    }

    mapping(string => uint256) private logic;

    event logicSetted(string indexed _key, uint256 _value);

    function SetLogic(string memory _key, uint256 _value) external {
        logic[_key] = _value;
        emit logicSetted(_key, _value);
    }

    function GetLogic(string memory _key) public view returns (uint256) {
        return logic[_key];
    }

    function GetInitializeData() public pure returns (bytes memory) {
        return abi.encodeWithSignature("initialize()");
    }
}
