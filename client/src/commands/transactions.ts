// Transaction command handlers
import { sendTransaction as sendSafeTransaction } from '../models/SafeWallet';
import { transactionService } from '../services/TransactionService';

const handleTransactionCommands = (
  command: string,
  callbacks: {
    updateTransactions: (tx: any) => void
  }
) => {
  const commandParts = command.split(' ');
  const action = commandParts[0].toLowerCase();
  
  switch (action) {
    case 'send':
      if (commandParts.length >= 4) {
        const [_, from, to, amount] = commandParts;
        handleSendTransaction(from, to, amount, callbacks.updateTransactions);
        return true;
      } else {
        alert('Usage: send [from_address] [to_address] [amount]');
        return true;
      }
    default:
      return false;
  }
};

// Helper function to handle send transaction logic
const handleSendTransaction = async (
  from: string,
  to: string,
  amount: string,
  updateTransactions: (tx: any) => void
) => {
  try {
    const tx = await sendSafeTransaction(from, to, amount);
    updateTransactions(tx);
    alert(`Safe transaction created: ${amount} ETH to ${to}\nTransaction Hash: ${tx.safeTxHash}\nStatus: ${tx.status}`);
  } catch (error: any) {
    console.error('Error sending Safe transaction:', error);
    alert(`Failed to send transaction: ${error.message || 'Unknown error'}`);
  }
};

export default handleTransactionCommands; 