// Wallet command handlers

const handleWalletCommands = (
  command: string,
  callbacks: {
    disconnect: () => void,
    connect: () => void
  }
) => {
  const cmd = command.trim().toLowerCase();
  
  switch (cmd) {
    case 'q':
      callbacks.disconnect();
      return true;
    case 'c':
      callbacks.connect();
      return true;
    default:
      return false;
  }
};

// Helper for global wallet commands
export const dispatchGlobalWalletCommand = (command: string) => {
  window.dispatchEvent(new CustomEvent('vito:command', { 
    detail: { command } 
  }));
};

export default handleWalletCommands; 