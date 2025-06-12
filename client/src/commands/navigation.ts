// Navigation command handlers
// import { MenuSection } from '../components/wallet/types';

const handleNavigationCommands = (
  command: string,
  setActiveSection: (section: string) => void
) => {
  const cmd = command.trim().toLowerCase();
  
  switch (cmd) {
    case 'assets':
    case 'ast':
      setActiveSection('assets');
      return true;
    case 'home':
      setActiveSection('home');
      return true;
    case 'transactions':
    case 'txs':
      setActiveSection('transactions');
      return true;
    case 'settings':
    case 'set':
      setActiveSection('settings');
      return true;
    default:
      return false;
  }
};

export default handleNavigationCommands; 