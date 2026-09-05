// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VerificationRegistry {

    mapping(bytes32 => bool) public verifiedHashes;

    event HashRegistered(
        bytes32 indexed hash,
        uint256 timestamp
    );

    function registerHash(bytes32 hash) public {
        verifiedHashes[hash] = true;

        emit HashRegistered(
            hash,
            block.timestamp
        );
    }

    function verifyHash(bytes32 hash) public view returns (bool) {
        return verifiedHashes[hash];
    }
}