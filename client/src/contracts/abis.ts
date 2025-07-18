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
      {"name": "", "type": "bool"}
    ],
    "stateMutability": "view"
  }
];

// SafeTxPool contract ABI (legacy - for backward compatibility)
export const SAFE_TX_POOL_ABI = [
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

// Safe Wallet contract ABI (core methods we need)
export const SAFE_ABI = [
  {
    "type": "function",
    "name": "getOwners",
    "inputs": [],
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getThreshold",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nonce",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "VERSION",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "execTransaction",
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "data", "type": "bytes"},
      {"name": "operation", "type": "uint8"},
      {"name": "safeTxGas", "type": "uint256"},
      {"name": "baseGas", "type": "uint256"},
      {"name": "gasPrice", "type": "uint256"},
      {"name": "gasToken", "type": "address"},
      {"name": "refundReceiver", "type": "address"},
      {"name": "signatures", "type": "bytes"}
    ],
    "outputs": [{"name": "success", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getTransactionHash",
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "data", "type": "bytes"},
      {"name": "operation", "type": "uint8"},
      {"name": "safeTxGas", "type": "uint256"},
      {"name": "baseGas", "type": "uint256"},
      {"name": "gasPrice", "type": "uint256"},
      {"name": "gasToken", "type": "address"},
      {"name": "refundReceiver", "type": "address"},
      {"name": "nonce", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bytes32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isOwner",
    "inputs": [{"name": "owner", "type": "address"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  // Events for tracking executed transactions
  {
    "type": "event",
    "name": "ExecutionSuccess",
    "inputs": [
      {"name": "txHash", "type": "bytes32", "indexed": true},
      {"name": "payment", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "ExecutionFailure",
    "inputs": [
      {"name": "txHash", "type": "bytes32", "indexed": true},
      {"name": "payment", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "SafeSetup",
    "inputs": [
      {"name": "initiator", "type": "address", "indexed": true},
      {"name": "owners", "type": "address[]", "indexed": false},
      {"name": "threshold", "type": "uint256", "indexed": false},
      {"name": "initializer", "type": "address", "indexed": false},
      {"name": "fallbackHandler", "type": "address", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "AddedOwner",
    "inputs": [
      {"name": "owner", "type": "address", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "RemovedOwner",
    "inputs": [
      {"name": "owner", "type": "address", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "ChangedThreshold",
    "inputs": [
      {"name": "threshold", "type": "uint256", "indexed": false}
    ]
  },
  // Guard management functions
  {
    "type": "function",
    "name": "setGuard",
    "inputs": [{"name": "guard", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // Guard events
  {
    "type": "event",
    "name": "ChangedGuard",
    "inputs": [
      {"name": "guard", "type": "address", "indexed": true}
    ]
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

// SafeTxPoolRegistry contract addresses for different networks (new architecture)
// These addresses should be updated with the actual deployed registry contract addresses
export const SAFE_TX_POOL_REGISTRY_ADDRESSES = {
  ethereum: process.env.REACT_APP_SAFE_TX_POOL_REGISTRY_ETHEREUM || '0x0000000000000000000000000000000000000000',
  sepolia: process.env.REACT_APP_SAFE_TX_POOL_REGISTRY_SEPOLIA || '0x0000000000000000000000000000000000000000',
  arbitrum: process.env.REACT_APP_SAFE_TX_POOL_REGISTRY_ARBITRUM || '0x0000000000000000000000000000000000000000'
};

// SafeTxPool contract addresses for different networks (legacy - for backward compatibility)
// These addresses should be updated with the actual deployed contract addresses
export const SAFE_TX_POOL_ADDRESSES = {
  ethereum: process.env.REACT_APP_SAFE_TX_POOL_ETHEREUM || '0x0000000000000000000000000000000000000000',
  sepolia: process.env.REACT_APP_SAFE_TX_POOL_SEPOLIA || '0x0000000000000000000000000000000000000000',
  arbitrum: process.env.REACT_APP_SAFE_TX_POOL_ARBITRUM || '0x0000000000000000000000000000000000000000'
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

// Utility function to check if a Safe TX Pool address is configured (legacy)
export const isSafeTxPoolConfigured = (network: string): boolean => {
  const address = SAFE_TX_POOL_ADDRESSES[network as keyof typeof SAFE_TX_POOL_ADDRESSES];
  return Boolean(address && address !== '0x0000000000000000000000000000000000000000');
};

// Utility function to get Safe TX Pool address with validation (legacy)
export const getSafeTxPoolAddress = (network: string): string | null => {
  const address = SAFE_TX_POOL_ADDRESSES[network as keyof typeof SAFE_TX_POOL_ADDRESSES];
  return isSafeTxPoolConfigured(network) ? address : null;
};

// Network configurations
export const NETWORK_CONFIGS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    safeTxPoolRegistryAddress: SAFE_TX_POOL_REGISTRY_ADDRESSES.ethereum,
    safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.ethereum, // legacy
    isTestnet: false
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io',
    safeTxPoolRegistryAddress: SAFE_TX_POOL_REGISTRY_ADDRESSES.sepolia,
    safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.sepolia, // legacy
    isTestnet: true
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    safeTxPoolRegistryAddress: SAFE_TX_POOL_REGISTRY_ADDRESSES.arbitrum,
    safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.arbitrum, // legacy
    isTestnet: false
  }
};

/**
 * Get RPC URL for a specific network with environment variable support
 * @param network The network name (ethereum, sepolia, arbitrum)
 * @returns RPC URL for the network
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
