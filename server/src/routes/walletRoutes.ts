import express from 'express';

const router = express.Router();

// Mock data - in a real app, would connect to Safe Wallet API
const accounts = [
  {
    address: '0x1234567890123456789012345678901234567890',
    balance: '10.5',
    name: 'Main Safe',
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    balance: '5.2',
    name: 'Team Safe',
  },
];

const transactions = [
  {
    id: 'tx1',
    from: '0x1234567890123456789012345678901234567890',
    to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    amount: '1.5',
    status: 'completed',
    timestamp: Date.now() - 86400000, // 1 day ago
  },
  {
    id: 'tx2',
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x1234567890123456789012345678901234567890',
    amount: '0.5',
    status: 'pending',
    timestamp: Date.now() - 3600000, // 1 hour ago
  },
];

// Get all accounts
router.get('/accounts', (req, res) => {
  res.json(accounts);
});

// Get account by address
router.get('/accounts/:address', (req, res) => {
  const account = accounts.find(acc => acc.address === req.params.address);
  if (account) {
    res.json(account);
  } else {
    res.status(404).json({ error: 'Account not found' });
  }
});

// Get all transactions
router.get('/transactions', (req, res) => {
  res.json(transactions);
});

// Get transaction by ID
router.get('/transactions/:id', (req, res) => {
  const transaction = transactions.find(tx => tx.id === req.params.id);
  if (transaction) {
    res.json(transaction);
  } else {
    res.status(404).json({ error: 'Transaction not found' });
  }
});

// Create new transaction
router.post('/transactions', (req, res) => {
  const { from, to, amount } = req.body;
  
  // Validate inputs
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // In a real app, would submit to Safe Wallet API
  const newTransaction = {
    id: `tx${Date.now()}`,
    from,
    to,
    amount,
    status: 'pending',
    timestamp: Date.now(),
  };
  
  transactions.push(newTransaction);
  res.status(201).json(newTransaction);
});

export default router; 