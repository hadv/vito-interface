// Transaction command handlers

// Mock function for sending transactions - replace with actual implementation
const sendTransaction = async (from: string, to: string, amount: string) => {
  return {
    id: Date.now().toString(),
    from,
    to,
    amount,
    status: 'pending',
    timestamp: new Date().toISOString()
  };
};

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
    const tx = await sendTransaction(from, to, amount);
    updateTransactions(tx);
    alert(`Transaction initiated: ${amount} from ${from} to ${to}`);
  } catch (error) {
    console.error('Error sending transaction:', error);
    alert('Failed to send transaction');
  }
};

export default handleTransactionCommands; 