import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { dAppWalletConnectService } from '../../services/DAppWalletConnectService';

interface ConnectedDApp {
  topic: string;
  name: string;
  url: string;
  icon?: string;
}

interface DAppConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (pairingCode: string) => Promise<void>;
}

const DAppConnectionModal: React.FC<DAppConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect
}) => {
  const [pairingCode, setPairingCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [connectedDApps, setConnectedDApps] = useState<ConnectedDApp[]>([]);

  // Function to refresh connected dApps list
  const refreshConnectedDApps = () => {
    try {
      const sessions = dAppWalletConnectService.getActiveSessions();

      // Get full session data from the service
      const fullSessions = sessions.map(session => {
        const fullSession = dAppWalletConnectService.getFullSession(session.topic);
        return fullSession || session;
      });

      const dApps = fullSessions
        .filter(session => session.peer && session.peer.metadata)
        .map(session => ({
          topic: session.topic,
          name: session.peer.metadata.name || 'Unknown dApp',
          url: session.peer.metadata.url || '',
          icon: session.peer.metadata.icons?.[0] || ''
        }));

      setConnectedDApps(dApps);
    } catch (error) {
      console.error('Error refreshing connected dApps:', error);
      setConnectedDApps([]);
    }
  };

  // Reset state when modal opens/closes and load connected dApps
  useEffect(() => {
    if (isOpen) {
      setPairingCode('');
      setError(undefined);
      setIsConnecting(false);

      // Load currently connected dApps
      refreshConnectedDApps();
    }
  }, [isOpen]);

  // Listen for dApp connection events
  useEffect(() => {
    const handleSessionConnected = () => refreshConnectedDApps();
    const handleSessionDisconnected = () => refreshConnectedDApps();

    dAppWalletConnectService.on('session_connected', handleSessionConnected);
    dAppWalletConnectService.on('session_disconnected', handleSessionDisconnected);

    return () => {
      dAppWalletConnectService.off('session_connected', handleSessionConnected);
      dAppWalletConnectService.off('session_disconnected', handleSessionDisconnected);
    };
  }, []);

  // Handle paste button click
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPairingCode(text);
      setError(undefined);

      // Auto-connect after pasting if it's a valid WalletConnect URI
      if (text.trim().startsWith('wc:') && text.length > 10) {
        await handleConnect(text.trim());
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setError('Failed to read clipboard. Please paste manually.');
    }
  };

  // Handle connect functionality
  const handleConnect = async (code?: string) => {
    const codeToUse = code || pairingCode.trim();

    if (!codeToUse) {
      setError('Please enter a pairing code');
      return;
    }

    setIsConnecting(true);
    setError(undefined);

    try {
      await onConnect(codeToUse);
      // Connected dApps will be updated via event listeners
      setPairingCode('');
    } catch (err: any) {
      console.error('Failed to connect dApp:', err);
      setError(err.message || 'Failed to connect to dApp');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle overlay click to close modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle input change and auto-connect when URI is pasted
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPairingCode(value);
    if (error) {
      setError(undefined);
    }

    // Auto-connect when a valid WalletConnect URI is pasted
    if (value.trim().startsWith('wc:') && value.length > 10) {
      await handleConnect(value.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[10000] flex justify-end"
      onClick={handleOverlayClick}
      style={{ paddingTop: '80px', paddingRight: '20px' }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-2xl w-full max-w-lg shadow-2xl h-fit">
        {/* Header */}
        <div className="p-6 text-center relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* WalletConnect Icon */}
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="20" viewBox="0 0 40 25" fill="none">
              <path d="m8.19180572 4.83416816c6.52149658-6.38508884 17.09493158-6.38508884 23.61642788 0l.7848727.76845565c.3260748.31925442.3260748.83686816 0 1.15612272l-2.6848927 2.62873374c-.1630375.15962734-.4273733.15962734-.5904108 0l-1.0800779-1.05748639c-4.5495589-4.45439756-11.9258514-4.45439756-16.4754105 0l-1.1566741 1.13248068c-.1630376.15962721-.4273735.15962721-.5904108 0l-2.68489263-2.62873375c-.32607483-.31925456-.32607483-.83686829 0-1.15612272zm29.16903948 5.43649934 2.3895596 2.3395862c.3260732.319253.3260751.8368636.0000041 1.1561187l-10.7746894 10.5494845c-.3260726.3192568-.8547443.3192604-1.1808214.0000083-.0000013-.0000013-.0000029-.0000029-.0000042-.0000043l-7.6472191-7.4872762c-.0815187-.0798136-.2136867-.0798136-.2952053 0-.0000006.0000005-.000001.000001-.0000015.0000014l-7.6470562 7.4872708c-.3260715.3192576-.8547434.319263-1.1808215.0000116-.0000019-.0000018-.0000039-.0000037-.0000059-.0000058l-10.7749893-10.5496247c-.32607469-.3192544-.32607469-.8368682 0-1.1561226l2.38956395-2.3395823c.3260747-.31925446.85474652-.31925446 1.18082136 0l7.64733029 7.4873809c.0815188.0798136.2136866.0798136.2952054 0 .0000012-.0000012.0000023-.0000023.0000035-.0000032l7.6469471-7.4873777c.3260673-.31926181.8547392-.31927378 1.1808214-.0000267.0000046.0000045.0000091.000009.0000135.0000135l7.6473203 7.4873909c.0815186.0798135.2136866.0798135.2952053 0l7.6471967-7.4872433c.3260748-.31925458.8547465-.31925458 1.1808213 0z" fill="#3b99fc"/>
            </svg>
          </div>

          {/* Title and Description */}
          <h2 className="text-xl font-bold text-white mb-2">Connect dApps to Safe{'{Wallet}'}</h2>
          <p className="text-gray-400 text-sm">Paste the pairing code below to connect to your Safe{'{Wallet}'} via WalletConnect</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Pairing Code Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-green-400 text-left">
              Pairing code
            </label>
            <div className="relative">
              <input
                type="text"
                value={pairingCode}
                onChange={handleInputChange}
                placeholder="wc:"
                className={cn(
                  'w-full h-14 px-4 py-4 pr-20 bg-gray-900 border-2 border-green-500 rounded-lg text-white placeholder-gray-500 text-base',
                  'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200',
                  error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-green-500'
                )}
                disabled={isConnecting}
              />
              <button
                onClick={handlePaste}
                disabled={isConnecting}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Paste
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </div>

          {/* Connection Status */}
          {isConnecting && (
            <div className="flex items-center justify-center gap-2 py-3 text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Connecting...
            </div>
          )}





          {/* Connected dApps Status */}
          {connectedDApps.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">Connected dApps ({connectedDApps.length})</p>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Active connections" />
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {connectedDApps.map((dapp) => (
                  <div key={dapp.topic} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      {dapp.icon ? (
                        <img src={dapp.icon} alt={dapp.name} className="w-6 h-6 rounded" />
                      ) : (
                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                            <path d="M2 17L12 22L22 17"/>
                            <path d="M2 12L12 17L22 12"/>
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-white">{dapp.name}</div>
                        {dapp.url && <div className="text-xs text-gray-400 truncate max-w-48">{dapp.url}</div>}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await dAppWalletConnectService.disconnectDApp(dapp.topic);
                          // Refresh the connected dApps list after disconnection
                          refreshConnectedDApps();
                        } catch (error) {
                          console.error('Failed to disconnect dApp:', error);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 p-1 transition-colors rounded hover:bg-red-500/10"
                      title="Disconnect dApp"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No dApps are connected yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DAppConnectionModal;
