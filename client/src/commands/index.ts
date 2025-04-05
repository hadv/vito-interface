import handleNavigationCommands from './navigation';
import handleWalletCommands, { dispatchGlobalWalletCommand } from './wallet';
import handleTransactionCommands from './transactions';
import handleHelpCommand from './help';

export interface CommandContext {
  // Navigation
  setActiveSection?: (section: string) => void;
  
  // Wallet
  connectWallet?: () => void;
  disconnectWallet?: () => void;
  
  // Transactions
  updateTransactions?: (tx: any) => void;
}

// Main command processor that delegates to specific handlers
const processCommand = (command: string, context: CommandContext): boolean => {
  // Try each handler in sequence and return on first match
  
  // First try wallet commands
  if (handleWalletCommands(command, {
    connect: context.connectWallet || (() => {}),
    disconnect: context.disconnectWallet || (() => {})
  })) {
    return true;
  }
  
  // Then try navigation commands
  if (context.setActiveSection && 
      handleNavigationCommands(command, context.setActiveSection)) {
    return true;
  }
  
  // Then try transaction commands
  if (context.updateTransactions && 
      handleTransactionCommands(command, {
        updateTransactions: context.updateTransactions
      })) {
    return true;
  }
  
  // Finally try help command
  if (handleHelpCommand(command)) {
    return true;
  }
  
  // If no handler matched, return false
  console.log(`Unknown command: ${command}`);
  return false;
};

export {
  processCommand,
  dispatchGlobalWalletCommand
}; 