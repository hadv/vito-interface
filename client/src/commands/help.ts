// Help command handlers

const handleHelpCommand = (command: string) => {
  const cmd = command.trim().toLowerCase();
  
  if (cmd === 'help') {
    const helpMessage = 
      'Available commands:\n' +
      '- :q - Disconnect wallet\n' +
      '- :c - Connect wallet\n' +
      '- :home - Switch to home section\n' +
      '- :assets (ast) - Switch to assets section\n' +
      '- :transactions (txs) - Switch to transactions section\n' +
      '- :settings (set) - Switch to settings section\n' +
      '- :send [from] [to] [amount] - Send a transaction\n' +
      '- :help - Show this help message';
    
    alert(helpMessage);
    return true;
  }
  
  return false;
};

export default handleHelpCommand; 