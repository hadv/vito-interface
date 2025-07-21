// Contract ABIs for interacting with smart contracts

// SafeTxPoolRegistry contract ABI - Main coordinator contract (updated architecture)
export const SAFE_TX_POOL_REGISTRY_ABI = [
  // Transaction Pool Functions
  {
    "type": "function",
    "name": "proposeTx",
    "inputs": [
      {"name": "txHash", "type": "bytes32"},
      {"name": "safe", "type": "address"},
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "data", "type": "bytes"},
      {"name": "operation", "type": "uint8"},
      {"name": "nonce", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "signTx",
    "inputs": [
      {"name": "txHash", "type": "bytes32"},
      {"name": "signature", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markAsExecuted",
    "inputs": [
      {"name": "txHash", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deleteTx",
    "inputs": [
      {"name": "txHash", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getTxDetails",
    "inputs": [
      {"name": "txHash", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "safe", "type": "address"},
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "data", "type": "bytes"},
      {"name": "operation", "type": "uint8"},
      {"name": "proposer", "type": "address"},
      {"name": "nonce", "type": "uint256"},
      {"name": "txId", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSignatures",
    "inputs": [
      {"name": "txHash", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "", "type": "bytes[]"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasSignedTx",
    "inputs": [
      {"name": "txHash", "type": "bytes32"},
      {"name": "signer", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPendingTxHashes",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "offset", "type": "uint256"},
      {"name": "limit", "type": "uint256"}
    ],
    "outputs": [
      {"name": "", "type": "bytes32[]"}
    ],
    "stateMutability": "view"
  },
  // Address Book Functions
  {
    "type": "function",
    "name": "addAddressBookEntry",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "walletAddress", "type": "address"},
      {"name": "name", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeAddressBookEntry",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "walletAddress", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAddressBookEntries",
    "inputs": [
      {"name": "safe", "type": "address"}
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {"name": "name", "type": "bytes32"},
          {"name": "walletAddress", "type": "address"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  // Delegate Call Functions
  {
    "type": "function",
    "name": "setDelegateCallEnabled",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "enabled", "type": "bool"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addDelegateCallTarget",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "target", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeDelegateCallTarget",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "target", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isDelegateCallEnabled",
    "inputs": [
      {"name": "safe", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isDelegateCallTargetAllowed",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "target", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDelegateCallTargets",
    "inputs": [
      {"name": "safe", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "address[]"}
    ],
    "stateMutability": "view"
  },
  // Trusted Contract Functions
  {
    "type": "function",
    "name": "addTrustedContract",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "contractAddress", "type": "address"},
      {"name": "name", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeTrustedContract",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "contractAddress", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isTrustedContract",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "contractAddress", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTrustedContracts",
    "inputs": [
      {"name": "safe", "type": "address"}
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {"name": "name", "type": "bytes32"},
          {"name": "contractAddress", "type": "address"}
        ]
      }
    ],
    "stateMutability": "view"
  }
];

// Safe Wallet contract ABI (core methods we need)
export const SAFE_TX_POOL_REGISTRY_EXTENDED_ABI = [
  {
    "type": "function",
    "name": "proposeTx",
    "inputs": [
      {"name": "txHash", "type": "bytes32"},
      {"name": "safe", "type": "address"},
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "data", "type": "bytes"},
      {"name": "operation", "type": "uint8"},
      {"name": "nonce", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "signTx",
    "inputs": [
      {"name": "txHash", "type": "bytes32"},
      {"name": "signature", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markAsExecuted",
    "inputs": [
      {"name": "txHash", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getTxDetails",
    "inputs": [
      {"name": "txHash", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "safe", "type": "address"},
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "data", "type": "bytes"},
      {"name": "operation", "type": "uint8"},
      {"name": "proposer", "type": "address"},
      {"name": "nonce", "type": "uint256"},
      {"name": "txId", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSignatures",
    "inputs": [
      {"name": "txHash", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "", "type": "bytes[]"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasSignedTx",
    "inputs": [
      {"name": "txHash", "type": "bytes32"},
      {"name": "signer", "type": "address"}
    ],
    "outputs": [
      {"name": "", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPendingTxHashes",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "offset", "type": "uint256"},
      {"name": "limit", "type": "uint256"}
    ],
    "outputs": [
      {"name": "", "type": "bytes32[]"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deleteTx",
    "inputs": [
      {"name": "txHash", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "TransactionProposed",
    "inputs": [
      {"name": "txHash", "type": "bytes32", "indexed": true},
      {"name": "proposer", "type": "address", "indexed": true},
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "to", "type": "address", "indexed": false},
      {"name": "value", "type": "uint256", "indexed": false},
      {"name": "data", "type": "bytes", "indexed": false},
      {"name": "operation", "type": "uint8", "indexed": false},
      {"name": "nonce", "type": "uint256", "indexed": false},
      {"name": "txId", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "TransactionSigned",
    "inputs": [
      {"name": "txHash", "type": "bytes32", "indexed": true},
      {"name": "signer", "type": "address", "indexed": true},
      {"name": "signature", "type": "bytes", "indexed": false},
      {"name": "txId", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "TransactionExecuted",
    "inputs": [
      {"name": "txHash", "type": "bytes32", "indexed": true},
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "txId", "type": "uint256", "indexed": false}
    ]
  },
  // Address Book functions
  {
    "type": "function",
    "name": "addAddressBookEntry",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "walletAddress", "type": "address"},
      {"name": "name", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeAddressBookEntry",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "walletAddress", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAddressBookEntries",
    "inputs": [
      {"name": "safe", "type": "address"}
    ],
    "outputs": [
      {
        "name": "entries",
        "type": "tuple[]",
        "components": [
          {"name": "name", "type": "bytes32"},
          {"name": "walletAddress", "type": "address"}
        ]
      }
    ],
    "stateMutability": "view"
  },
  // Address Book events
  {
    "type": "event",
    "name": "AddressBookEntryAdded",
    "inputs": [
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "walletAddress", "type": "address", "indexed": true},
      {"name": "name", "type": "bytes32", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "AddressBookEntryRemoved",
    "inputs": [
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "walletAddress", "type": "address", "indexed": true}
    ]
  },
  // Delegate Call Control functions
  {
    "type": "function",
    "name": "setDelegateCallEnabled",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "enabled", "type": "bool"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addDelegateCallTarget",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "target", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeDelegateCallTarget",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "target", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isDelegateCallEnabled",
    "inputs": [
      {"name": "safe", "type": "address"}
    ],
    "outputs": [
      {"name": "enabled", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isDelegateCallTargetAllowed",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "target", "type": "address"}
    ],
    "outputs": [
      {"name": "allowed", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDelegateCallTargets",
    "inputs": [
      {"name": "safe", "type": "address"}
    ],
    "outputs": [
      {"name": "targets", "type": "address[]"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDelegateCallTargetsCount",
    "inputs": [
      {"name": "safe", "type": "address"}
    ],
    "outputs": [
      {"name": "count", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  // Delegate Call Control events
  {
    "type": "event",
    "name": "DelegateCallToggled",
    "inputs": [
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "enabled", "type": "bool", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "DelegateCallTargetAdded",
    "inputs": [
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "target", "type": "address", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "DelegateCallTargetRemoved",
    "inputs": [
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "target", "type": "address", "indexed": true}
    ]
  },
  // Trusted Contracts functions
  {
    "type": "function",
    "name": "addTrustedContract",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "contractAddress", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeTrustedContract",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "contractAddress", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isTrustedContract",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "contractAddress", "type": "address"}
    ],
    "outputs": [
      {"name": "trusted", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  // Trusted Contracts events
  {
    "type": "event",
    "name": "TrustedContractAdded",
    "inputs": [
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "contractAddress", "type": "address", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "TrustedContractRemoved",
    "inputs": [
      {"name": "safe", "type": "address", "indexed": true},
      {"name": "contractAddress", "type": "address", "indexed": true}
    ]
  }
];

// Safe Wallet contract ABI (latest version from vito-contracts submodule)
// Updated from Safe v1.4.1 with complete function and event definitions
export const SAFE_ABI = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "fallback",
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "VERSION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addOwnerWithThreshold",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_threshold",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approveHash",
    "inputs": [
      {
        "name": "hashToApprove",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approvedHashes",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "changeThreshold",
    "inputs": [
      {
        "name": "_threshold",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "checkNSignatures",
    "inputs": [
      {
        "name": "dataHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "signatures",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "requiredSignatures",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkSignatures",
    "inputs": [
      {
        "name": "dataHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "signatures",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "disableModule",
    "inputs": [
      {
        "name": "prevModule",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "module",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "domainSeparator",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "enableModule",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "encodeTransactionData",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8",
        "internalType": "enum Enum.Operation"
      },
      {
        "name": "safeTxGas",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "baseGas",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasPrice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "refundReceiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_nonce",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "execTransaction",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8",
        "internalType": "enum Enum.Operation"
      },
      {
        "name": "safeTxGas",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "baseGas",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasPrice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "refundReceiver",
        "type": "address",
        "internalType": "address payable"
      },
      {
        "name": "signatures",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "execTransactionFromModule",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8",
        "internalType": "enum Enum.Operation"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execTransactionFromModuleReturnData",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8",
        "internalType": "enum Enum.Operation"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "returnData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getChainId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getModulesPaginated",
    "inputs": [
      {
        "name": "start",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "pageSize",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "array",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "next",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOwners",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStorageAt",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getThreshold",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTransactionHash",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8",
        "internalType": "enum Enum.Operation"
      },
      {
        "name": "safeTxGas",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "baseGas",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasPrice",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "refundReceiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_nonce",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isModuleEnabled",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nonce",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "removeOwner",
    "inputs": [
      {
        "name": "prevOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_threshold",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setFallbackHandler",
    "inputs": [
      {
        "name": "handler",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setGuard",
    "inputs": [
      {
        "name": "guard",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setup",
    "inputs": [
      {
        "name": "_owners",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "_threshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "fallbackHandler",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "paymentToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "payment",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "paymentReceiver",
        "type": "address",
        "internalType": "address payable"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "signedMessages",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "simulateAndRevert",
    "inputs": [
      {
        "name": "targetContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "calldataPayload",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "swapOwner",
    "inputs": [
      {
        "name": "prevOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "oldOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // Events
  {
    "type": "event",
    "name": "AddedOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ApproveHash",
    "inputs": [
      {
        "name": "approvedHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ChangedFallbackHandler",
    "inputs": [
      {
        "name": "handler",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ChangedGuard",
    "inputs": [
      {
        "name": "guard",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ChangedThreshold",
    "inputs": [
      {
        "name": "threshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisabledModule",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EnabledModule",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ExecutionFailure",
    "inputs": [
      {
        "name": "txHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "payment",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ExecutionFromModuleFailure",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ExecutionFromModuleSuccess",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ExecutionSuccess",
    "inputs": [
      {
        "name": "txHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "payment",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RemovedOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SafeReceived",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SafeSetup",
    "inputs": [
      {
        "name": "initiator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owners",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "initializer",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "fallbackHandler",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SignMsg",
    "inputs": [
      {
        "name": "msgHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  }
];

export const ERC20_ABI = [
  // Read functions
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  // Write functions
  {
    "constant": false,
    "inputs": [
      {"name": "_to", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "from", "type": "address"},
      {"indexed": true, "name": "to", "type": "address"},
      {"indexed": false, "name": "value", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
  }
];

// Common token addresses for different networks
export const TOKEN_ADDRESSES = {
  ethereum: {
    USDC: '0xA0b86a33E6441b8C4505B4afDcA7aBB2B6e1B4B4',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  },
  sepolia: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789'
  },
  arbitrum: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
  }
};

// SafeTxPoolRegistry contract addresses for different networks
// These addresses should be updated with the actual deployed registry contract addresses
export const SAFE_TX_POOL_REGISTRY_ADDRESSES = {
  ethereum: process.env.REACT_APP_SAFE_TX_POOL_REGISTRY_ETHEREUM || '0x0000000000000000000000000000000000000000',
  sepolia: process.env.REACT_APP_SAFE_TX_POOL_REGISTRY_SEPOLIA || '0x0000000000000000000000000000000000000000',
  arbitrum: process.env.REACT_APP_SAFE_TX_POOL_REGISTRY_ARBITRUM || '0x0000000000000000000000000000000000000000'
};

// Utility function to check if a Safe TX Pool Registry address is configured
export const isSafeTxPoolRegistryConfigured = (network: string): boolean => {
  const address = SAFE_TX_POOL_REGISTRY_ADDRESSES[network as keyof typeof SAFE_TX_POOL_REGISTRY_ADDRESSES];
  return Boolean(address && address !== '0x0000000000000000000000000000000000000000');
};

// Utility function to get Safe TX Pool Registry address with validation
export const getSafeTxPoolRegistryAddress = (network: string): string | null => {
  const address = SAFE_TX_POOL_REGISTRY_ADDRESSES[network as keyof typeof SAFE_TX_POOL_REGISTRY_ADDRESSES];
  return isSafeTxPoolRegistryConfigured(network) ? address : null;
};

// Network configurations
export const NETWORK_CONFIGS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    safeTxPoolRegistryAddress: SAFE_TX_POOL_REGISTRY_ADDRESSES.ethereum,
    isTestnet: false
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io',
    safeTxPoolRegistryAddress: SAFE_TX_POOL_REGISTRY_ADDRESSES.sepolia,
    isTestnet: true
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    safeTxPoolRegistryAddress: SAFE_TX_POOL_REGISTRY_ADDRESSES.arbitrum,
    isTestnet: false
  }
};

/**
 * Get default RPC URL for a specific network with environment variable support
 * This function provides the default/fallback RPC URLs and is used by RpcConfigService
 * @param network The network name (ethereum, sepolia, arbitrum)
 * @returns Default RPC URL for the network
 */
export const getRpcUrl = (network: string): string => {
  const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || 'YOUR_ALCHEMY_KEY';

  switch(network.toLowerCase()) {
    case 'arbitrum':
      return 'https://arb1.arbitrum.io/rpc';
    case 'sepolia':
      // Use Alchemy if available, otherwise use public RPC
      return ALCHEMY_KEY !== 'YOUR_ALCHEMY_KEY'
        ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : 'https://ethereum-sepolia-rpc.publicnode.com';
    case 'ethereum':
    default:
      // Use Alchemy if available, otherwise use public RPC
      return ALCHEMY_KEY !== 'YOUR_ALCHEMY_KEY'
        ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : 'https://ethereum-rpc.publicnode.com';
  }
};

/**
 * Get RPC URL for a specific network (custom or default)
 * This function checks for custom RPC URLs first, then falls back to defaults
 * @param network The network name (ethereum, sepolia, arbitrum)
 * @returns RPC URL for the network (custom if configured, otherwise default)
 */
export const getConfiguredRpcUrl = (network: string): string => {
  // Import RpcConfigService dynamically to avoid circular dependencies
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { rpcConfigService } = require('../services/RpcConfigService');
    return rpcConfigService.getRpcUrl(network);
  } catch (error) {
    // Fallback to default if service is not available
    console.warn('RpcConfigService not available, using default RPC URL:', error);
    return getRpcUrl(network);
  }
};
