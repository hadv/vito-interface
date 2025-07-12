/**
 * useWalletConnection Hook
 * Provides wallet connection state and utilities for React components
 */

import { useState, useEffect } from 'react';
import { walletConnectionService, WalletConnectionState } from '../services/WalletConnectionService';

export interface UseWalletConnectionReturn {
  connectionState: WalletConnectionState;
  isConnected: boolean;
  isSignerConnected: boolean;
  isReadOnlyMode: boolean;
  safeAddress: string | undefined;
  network: string | undefined;
  walletType: string | undefined;
  error: string | undefined;
  connectWallet: (params: {
    safeAddress: string;
    network: string;
    readOnlyMode?: boolean;
    rpcUrl?: string;
  }) => Promise<WalletConnectionState>;
  connectSignerWallet: () => Promise<WalletConnectionState>;
  disconnectWallet: () => void;
  switchNetwork: (network: string) => Promise<WalletConnectionState>;
}

/**
 * Hook for managing wallet connection state
 */
export const useWalletConnection = (): UseWalletConnectionReturn => {
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({
    isConnected: false,
    signerConnected: false,
    readOnlyMode: false
  });

  // Subscribe to wallet connection state changes
  useEffect(() => {
    // Get initial state
    const initialState = walletConnectionService.getState();
    setConnectionState(initialState);

    // Subscribe to state changes
    const unsubscribe = walletConnectionService.subscribe((newState) => {
      setConnectionState(newState);
    });

    return unsubscribe;
  }, []);

  // Derived state for convenience
  const isConnected = connectionState.isConnected;
  const isSignerConnected = connectionState.signerConnected || false;
  const isReadOnlyMode = connectionState.readOnlyMode || false;
  const safeAddress = connectionState.safeAddress;
  const network = connectionState.network;
  const walletType = connectionState.walletType;
  const error = connectionState.error;

  // Wallet connection methods
  const connectWallet = async (params: {
    safeAddress: string;
    network: string;
    readOnlyMode?: boolean;
    rpcUrl?: string;
  }) => {
    return await walletConnectionService.connectWallet(params);
  };

  const connectSignerWallet = async () => {
    return await walletConnectionService.connectSignerWallet();
  };

  const disconnectWallet = async () => {
    await walletConnectionService.disconnectWallet();
  };

  const switchNetwork = async (network: string) => {
    return await walletConnectionService.switchNetwork(network);
  };

  return {
    connectionState,
    isConnected,
    isSignerConnected,
    isReadOnlyMode,
    safeAddress,
    network,
    walletType,
    error,
    connectWallet,
    connectSignerWallet,
    disconnectWallet,
    switchNetwork
  };
};
