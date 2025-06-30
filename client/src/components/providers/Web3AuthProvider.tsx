/**
 * Web3Auth Provider Component
 *
 * This component provides Web3Auth context using the standard Web3Auth Modal class.
 * Note: This version doesn't use React hooks as they're not available in this Web3Auth version.
 */

import React from 'react';

interface Web3AuthProviderProps {
  children: React.ReactNode;
}

export const Web3AuthProvider: React.FC<Web3AuthProviderProps> = ({ children }) => {
  // For now, just pass through children
  // Web3Auth will be initialized in the service layer
  return <>{children}</>;
};

export default Web3AuthProvider;
