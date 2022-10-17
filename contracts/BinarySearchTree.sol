// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.9;

// import "hardhat/console.sol";

library BinarySearchTreeLib {
    // uint256 private constant MAX_INT =
    //     115792089237316195423570985008687907853269984665640564039457584007913129639935;
    // uint256 private constant TIME_EXTENSION = 34560;

    struct Node {
        uint256 parent;
        uint256 value;
        uint256 left;
        uint256 right;
    }

    struct Tree {
        uint256 root;
        uint256 rootLast;
        mapping(uint256 => Node) nodes;
        mapping(uint256 => uint256[]) rootToList;
        mapping(uint256 => uint256[]) futureExpiries; //map from last divisible root to a list of exipiries sine that root. not ordered
        // uint256[] rootList; // can only be increasing
        // uint256 rootNotNeedBefore;
    }

    // helper function for insert
    function insertHelper(
        Tree storage self,
        uint256 newValue,
        uint256 nodeId
    ) public {
        // current node
        Node memory curNode = self.nodes[nodeId];
        // if value exists, no need to insert
        if (newValue != curNode.value) {
            if (newValue < curNode.value) {
                if (curNode.left == 0) {
                    self.nodes[curNode.value].left = newValue;
                    self.nodes[newValue] = Node(curNode.value, newValue, 0, 0);
                } else {
                    insertHelper(self, newValue, curNode.left);
                }
            } else {
                if (curNode.right == 0) {
                    self.nodes[curNode.value].right = newValue;
                    self.nodes[newValue] = Node(curNode.value, newValue, 0, 0);
                } else {
                    insertHelper(self, newValue, curNode.right);
                }
            }
        }
    }

    function insert(Tree storage self, uint256 newValue) public {
        // no tree exists
        if (self.root == 0) {
            self.root = newValue;
            self.nodes[newValue] = Node(0, newValue, 0, 0);
        } else {
            insertHelper(self, newValue, self.root);
        }
    }

    // function returnListHelper(
    //     Tree storage self,
    //     uint256 start,
    //     uint256 end,
    //     uint256 nodeId
    // ) public returns (uint256[] storage selectList) {
    //     if (start <= end) {
    //         // current node
    //         Node memory curNode = self.nodes[nodeId];
    //         if (curNode.value != 0) {
    //             if (curNode.value < start) {
    //                 returnListHelper(self, start, end, curNode.right);
    //             }

    //             if (curNode.value >= start && curNode.value <= end) {
    //                 selectList.push(curNode.value);
    //                 if (
    //                     self.rootToList[self.root].length == 0 ||
    //                     (self.rootToList[self.root].length > 0 &&
    //                         self.rootToList[self.root][
    //                             self.rootToList[self.root].length - 1
    //                         ] !=
    //                         curNode.value)
    //                 ) {
    //                     self.rootToList[self.root].push(curNode.value);
    //                 }
    //             }
    //             returnListHelper(self, start, end, curNode.right);
    //         }
    //     }
    // }

    // function returnList(
    //     Tree storage self,
    //     uint256 start,
    //     uint256 end
    // ) public returns (uint256[] storage) {
    //     return returnListHelper(self, start, end, self.root);
    // }

    // function returnListHelperEx(
    //     Tree storage self,
    //     uint256 start,
    //     uint256 end,
    //     uint256 nodeId,
    //     uint256 extension
    // ) internal {
    //     if (start <= end && end < extension) {
    //         if (self.nodes[nodeId].value != 0) {
    //             // current node
    //             Node memory curNode = self.nodes[nodeId];
    //             if (curNode.value > start) {
    //                 returnListHelperEx(
    //                     self,
    //                     start,
    //                     end,
    //                     curNode.left,
    //                     extension
    //                 );
    //             }
    //             if (
    //                 curNode.value <= end &&
    //                 curNode.value >= start &&
    //             ) {
    //                 if (
    //                     self.rootToList[self.root].length == 0 ||
    //                     (self.rootToList[self.root].length > 0 &&
    //                         self.rootToList[self.root][
    //                             self.rootToList[self.root].length - 1
    //                         ] !=
    //                         curNode.value)
    //                 ) {
    //                     self.rootToList[self.root].push(curNode.value);
    //                 }
    //             }

    //             if (
    //                 curNode.value <= extension &&
    //                 curNode.value >= end &&
    //                 self.checkExistence[curNode.value]
    //             ) {
    //                 if (
    //                     self.futureExpiries[self.root].length == 0 ||
    //                     (self.futureExpiries[self.root].length > 0 &&
    //                         self.futureExpiries[self.root][
    //                             self.futureExpiries[self.root].length - 1
    //                         ] !=
    //                         curNode.value)
    //                 ) {
    //                     self.futureExpiries[self.root].push(curNode.value);
    //                 }
    //             }
    //             returnListHelperEx(self, start, end, curNode.right, extension);
    //         }
    //     }
    // }

    // function findMinLargerThanGivenHelper(
    //     Tree storage self,
    //     uint256 lowEnd,
    //     uint256 nodeId
    // ) public returns (uint256) {
    //     Node memory curNode = self.nodes[nodeId];

    //     uint256 tempNode = curNode.left;
    //     while (self.nodes[tempNode].right != 0) {
    //         tempNode = self.nodes[tempNode].right;
    //     }
    //     uint256 tempValue = self.nodes[tempNode].value;

    //     if (curNode.right == 0 && curNode.value <= lowEnd) {
    //         return 0;
    //     } else if (curNode.value > lowEnd) {
    //         if (curNode.left == 0 || tempValue <= lowEnd) {
    //             return curNode.value;
    //         } else {
    //             return findMinLargerThanGivenHelper(self, lowEnd, curNode.left);
    //         }
    //     } else {
    //         return findMinLargerThanGivenHelper(self, lowEnd, curNode.right);
    //     }
    // }

    // function findMinLargerThanGiven(Tree storage self, uint256 lowEnd)
    //     public
    //     returns (uint256)
    // {
    //     if (self.root == 0) {
    //         return 0; //no tree case
    //     }
    //     return findMinLargerThanGivenHelper(self, lowEnd, self.root);
    // }

    function deleteNodeHelper(
        Tree storage self,
        uint256 deleteValue,
        uint256 nodeId
    ) public returns (uint256) {
        Node memory curNode = self.nodes[nodeId];

        if (curNode.value == deleteValue) {
            return deleteLeaf(self, curNode.value);
        } else if (curNode.value < deleteValue) {
            if (curNode.right == 0) {
                return 0;
            } else {
                return deleteNodeHelper(self, deleteValue, curNode.right);
            }
        } else {
            if (curNode.left == 0) {
                return 0;
            } else {
                return deleteNodeHelper(self, deleteValue, curNode.left);
            }
        }
    }

    function deleteLeaf(Tree storage self, uint256 nodeId)
        public
        returns (uint256 newNodeId)
    {
        Node memory curNode = self.nodes[nodeId];
        if (curNode.left != 0) {
            uint256 tempNode = curNode.left;
            while (self.nodes[tempNode].right != 0) {
                tempNode = self.nodes[tempNode].right;
            }
            uint256 tempValue = self.nodes[tempNode].value;

            // if (tempValue > curNode.left) {
            if (curNode.parent != 0) {
                if (curNode.value < curNode.parent) {
                    self.nodes[curNode.parent].left = tempValue;
                } else {
                    self.nodes[curNode.parent].right = tempValue;
                }
            }

            if (curNode.right != 0) {
                self.nodes[curNode.right].parent = tempValue;
            }

            self.nodes[curNode.left].parent = tempValue;
            curNode.value = tempValue;

            deleteNodeHelper(self, tempValue, curNode.left);
            self.nodes[tempValue] = curNode;
            self.nodes[nodeId] = Node(0, 0, 0, 0);
            newNodeId = tempValue;
            // } else {
            //     if (curNode.parent != 0) {
            //         if (curNode.value < curNode.parent) {
            //             self.nodes[curNode.parent].left = curNode.left;
            //         } else {
            //             self.nodes[curNode.parent].right = curNode.left;
            //         }
            //     }

            //     if (curNode.right != 0) {
            //         self.nodes[curNode.right].parent = curNode.left;
            //     }

            //     self.nodes[curNode.left].right = curNode.right;
            //     self.nodes[nodeId] = Node(0, 0, 0, 0);
            // }
        } else if (curNode.left == 0 && curNode.right != 0) {
            uint256 tempValue = curNode.right;
            if (curNode.parent != 0) {
                if (curNode.value < curNode.parent) {
                    self.nodes[curNode.parent].left = tempValue;
                } else {
                    self.nodes[curNode.parent].right = tempValue;
                }
            }

            self.nodes[curNode.right].parent = curNode.parent;
            self.nodes[nodeId] = Node(0, 0, 0, 0);
            newNodeId = tempValue;
        } else {
            if (curNode.parent != 0) {
                if (curNode.value < curNode.parent) {
                    self.nodes[curNode.parent].left = 0;
                } else {
                    self.nodes[curNode.parent].right = 0;
                }
            }
            self.nodes[nodeId] = Node(0, 0, 0, 0);
            newNodeId = 0;
        }
    }

    function deleteNode(Tree storage self, uint256 deleteValue)
        public
        returns (uint256 newRoot)
    {
        if (deleteValue != self.root) {
            deleteNodeHelper(self, deleteValue, self.root);
            newRoot = self.root;
        } else {
            newRoot = deleteNodeHelper(self, deleteValue, self.root);
            self.rootLast = self.root;
            self.root = newRoot;
        }
    }

    // function deleteHelper(
    //     Tree storage self,
    //     uint256 deleteValue,
    //     uint256 nodeId
    // ) internal {
    //     Node memory curNode = self.nodes[nodeId];
    //     if (curNode.value != 0 && self.checkExistence[nodeId]) {
    //         if (curNode.value == deleteValue) {
    //             self.checkExistence[nodeId] = false; //deleted
    //         }

    //         if (deleteValue > curNode.value) {
    //             deleteHelper(self, deleteValue, curNode.right);
    //         }

    //         if (deleteValue < curNode.value) {
    //             deleteHelper(self, deleteValue, curNode.left);
    //         }
    //     }
    // }

    // function remove(Tree storage self, uint256 deleteValue) public {
    //     // deleteHelper(self, deleteValue, self.root);
    //     deleteNode(self, deleteValue);
    // }

    function trimTreeHelper(
        Tree storage self,
        uint256 start,
        uint256 end,
        uint256 nodeId
    ) public {
        if (start <= end) {
            // current node
            Node memory curNode = self.nodes[nodeId];
            if (curNode.value != 0) {
                if (curNode.value < start) {
                    if (curNode.right != 0) {
                        trimTreeHelper(self, start, end, curNode.right);
                    }
                } else if (curNode.value >= start && curNode.value <= end) {
                    uint256 newNodeId = deleteNodeHelper(
                        self,
                        curNode.value,
                        curNode.value
                    );
                    if (newNodeId != 0) {
                        trimTreeHelper(self, start, end, newNodeId);
                    }
                } else {
                    if (curNode.left != 0) {
                        trimTreeHelper(self, start, end, curNode.left);
                    }
                }
            }
        }
    }

    function trimTree(
        Tree storage self,
        uint256 start,
        uint256 end
    ) public returns (uint256 newRoot) {
        if (start <= end) {
            // current node
            Node memory rootNode = self.nodes[self.root];
            if (rootNode.value != 0) {
                if (rootNode.value < start) {
                    if (rootNode.right != 0) {
                        trimTreeHelper(self, start, end, rootNode.right);
                    }
                    newRoot = self.root;
                } else if (rootNode.value >= start && rootNode.value <= end) {
                    newRoot = deleteNode(self, rootNode.value);
                    if (newRoot != 0) {
                        trimTree(self, start, end);
                    }
                } else {
                    if (rootNode.left != 0) {
                        trimTreeHelper(self, start, end, rootNode.left);
                    }
                    newRoot = self.root;
                }
            }
        }
    }

    // function processExpiriesListTrimTree(
    //     Tree storage self,
    //     uint256 start,
    //     uint256 end
    // ) public {
    //     require(self.root != 0); //must have a tree
    //     // returnListHelper(self, start, end, self.root);
    //     delete self.futureExpiries[self.root];
    //     returnListHelperEx(self, start, end, self.root, end + TIME_EXTENSION);

    //     self.rootLast = self.root;
    //     uint256 leafNextSmallest = findMinLargerThanGiven(self, end + 1);
    //     self.root = end;
    //     self.nodes[self.root] = Node(end, 0, leafNextSmallest);
    //     self.checkExistence[self.root] = true;
    //     trimTree(self, end);
    // }

    // function getExpiriesList(Tree storage self)
    //     public
    //     view
    //     returns (uint256[] storage)
    // {
    //     return self.rootToList[self.rootLast];
    // }

    // function getUnorderedExpiriesList(Tree storage self)
    //     public
    //     view
    //     returns (uint256[] storage)
    // {
    //     return self.futureExpiries[self.rootLast];
    // }
    //     uint256[] storage expiries;
    //     uint256[] memory tmpRootList = self.rootList;
    //     // uint256 checkRoot = tmpRootList[tmpRootList.length-1];
    //     for (uint256 i=tmpRootList.length-1; i>=0; i--) {
    //         if (tmpRootList[i] >= 0) {
    //             uint256[] memory tmpExpiries = self.expiriesSinceLastDivisible[tmpRootList[i]];
    //             expiries.push(tmpExpiries[tmpExpiries.length-1]);
    //         } else {
    //             break;
    //         }
    //     }
    //     return expiries;
    // }
}
