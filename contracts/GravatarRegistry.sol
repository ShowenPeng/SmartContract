// SPDX-License-Identifier: MIT

pragma solidity >=0.5.0;

contract GravatarRegistry {
    event NewGravatar(
        uint256 id,
        address owner,
        string displayName,
        string imageUrl
    );
    event UpdatedGravatar(
        uint256 id,
        address owner,
        string displayName,
        string imageUrl
    );

    struct Gravatar {
        address owner;
        string displayName;
        string imageUrl;
    }

    Gravatar[] public gravatars;

    mapping(uint256 => address) public gravatarToOwner;
    mapping(address => uint256) public ownerToGravatar;

    function createGravatar(string _displayName, string _imageUrl) public {
        require(ownerToGravatar[msg.sender] == 0);
        uint256 id = gravatars.push(
            Gravatar(msg.sender, _displayName, _imageUrl)
        ) - 1;

        gravatarToOwner[id] = msg.sender;
        ownerToGravatar[msg.sender] = id;

        emit NewGravatar(id, msg.sender, _displayName, _imageUrl);
    }

    function updateGravatarName(string _displayName) public {
        require(ownerToGravatar[msg.sender] != 0);
        require(msg.sender == gravatars[ownerToGravatar[msg.sender]].owner);

        uint256 id = ownerToGravatar[msg.sender];

        gravatars[id].displayName = _displayName;
        emit UpdatedGravatar(
            id,
            msg.sender,
            _displayName,
            gravatars[id].imageUrl
        );
    }
}
