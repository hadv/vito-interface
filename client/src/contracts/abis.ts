// Contract ABIs for interacting with smart contracts

// SafeTxPool contract ABI
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
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
  },
  arbitrum: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
  }
};

// SafeTxPool contract addresses for different networks
export const SAFE_TX_POOL_ADDRESSES = {
  ethereum: '0x0000000000000000000000000000000000000000', // TODO: Add deployed address
  sepolia: '0x0000000000000000000000000000000000000000',   // TODO: Add deployed address
  arbitrum: '0x0000000000000000000000000000000000000000'   // TODO: Add deployed address
};

// Network configurations
export const NETWORK_CONFIGS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
    safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.ethereum
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.sepolia
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.arbitrum
  }
};
