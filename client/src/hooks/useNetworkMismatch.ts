import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NETWORK_CONFIGS } from '../contracts/abis';

interface NetworkMismatchState {
  hasMismatch: boolean;
  walletChainId: number | null;
  requiredChainId: number | null;
  walletNetwork: string | null;
  requiredNetwork: string | null;
  isChecking: boolean;
  error: string | null;
}

interface UseNetworkMismatchOptions {
  requiredNetwork?: string;
  autoCheck?: boolean;
  checkInterval?: number;
}

export const useNetworkMismatch = (options: UseNetworkMismatchOptions = {}) => {
  const {
    requiredNetwork,
    autoCheck = true,
    checkInterval = 5000 // Check every 5 seconds
  } = options;

  const [state, setState] = useState<NetworkMismatchState>({
    hasMismatch: false,
    walletChainId: null,
    requiredChainId: null,
    walletNetwork: null,
    requiredNetwork: null,
    isChecking: false,
    error: null
  });

  const checkNetworkMismatch = async (targetNetwork?: string) => {
    const networkToCheck = targetNetwork || requiredNetwork;
    
    if (!networkToCheck) {
      setState(prev => ({ ...prev, hasMismatch: false, error: 'No required network specified' }));
      return;
    }

    // Check if wallet is available
    if (typeof window.ethereum === 'undefined') {
      setState(prev => ({ 
        ...prev, 
        hasMismatch: false, 
        error: 'No wallet detected',
        isChecking: false 
      }));
      return;
    }

    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Get required network config
      const requiredConfig = NETWORK_CONFIGS[networkToCheck as keyof typeof NETWORK_CONFIGS];
      if (!requiredConfig) {
        setState(prev => ({ 
          ...prev, 
          hasMismatch: false, 
          error: `Unknown network: ${networkToCheck}`,
          isChecking: false 
        }));
        return;
      }

      // Get current wallet network
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      const walletChainId = network.chainId;
      const requiredChainId = requiredConfig.chainId;

      // Find wallet network name
      const walletNetworkEntry = Object.entries(NETWORK_CONFIGS).find(
        ([, config]) => config.chainId === walletChainId
      );
      const walletNetworkName = walletNetworkEntry ? walletNetworkEntry[0] : `Unknown (${walletChainId})`;

      const hasMismatch = walletChainId !== requiredChainId;

      setState({
        hasMismatch,
        walletChainId,
        requiredChainId,
        walletNetwork: walletNetworkName,
        requiredNetwork: networkToCheck,
        isChecking: false,
        error: null
      });

      console.log(`🔍 Network check: wallet=${walletChainId}, required=${requiredChainId}, mismatch=${hasMismatch}`);

    } catch (error: any) {
      console.error('Error checking network mismatch:', error);
      setState(prev => ({ 
        ...prev, 
        hasMismatch: false, 
        error: error.message || 'Failed to check network',
        isChecking: false 
      }));
    }
  };

  // Auto-check on mount and when required network changes
  useEffect(() => {
    if (autoCheck && requiredNetwork) {
      checkNetworkMismatch();
    }
  }, [requiredNetwork, autoCheck]);

  // Set up interval checking
  useEffect(() => {
    if (!autoCheck || !requiredNetwork) return;

    const interval = setInterval(() => {
      checkNetworkMismatch();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [autoCheck, requiredNetwork, checkInterval]);

  // Listen for network changes in MetaMask
  useEffect(() => {
    if (!autoCheck || typeof window.ethereum === 'undefined') return;

    const handleChainChanged = (chainId: string) => {
      console.log('🔄 Chain changed detected:', chainId);
      // Small delay to ensure the provider is updated
      setTimeout(() => {
        if (requiredNetwork) {
          checkNetworkMismatch();
        }
      }, 100);
    };

    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [autoCheck, requiredNetwork]);

  return {
    ...state,
    checkNetworkMismatch,
    refresh: () => checkNetworkMismatch()
  };
};

// Helper function to get network name from chain ID
export const getNetworkNameFromChainId = (chainId: number): string => {
  const networkEntry = Object.entries(NETWORK_CONFIGS).find(
    ([, config]) => config.chainId === chainId
  );
  return networkEntry ? networkEntry[1].name : `Unknown Network (${chainId})`;
};

// Helper function to check if a specific network is supported
export const isSupportedNetwork = (chainId: number): boolean => {
  return Object.values(NETWORK_CONFIGS).some(config => config.chainId === chainId);
};

export default useNetworkMismatch;
