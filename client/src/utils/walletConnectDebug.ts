/**
 * WalletConnect Debug Utilities
 * Helps diagnose and troubleshoot WalletConnect signing issues
 */

export interface WalletConnectDiagnostics {
  sessionActive: boolean;
  sessionTopic?: string;
  chainId?: number;
  address?: string;
  supportedMethods: string[];
  supportedEvents: string[];
  sessionExpiry?: number;
  errors: string[];
  warnings: string[];
}

/**
 * Diagnose WalletConnect session health for signing operations
 */
export function diagnoseWalletConnectSession(
  walletConnectService: any,
  expectedChainId?: number
): WalletConnectDiagnostics {
  const diagnostics: WalletConnectDiagnostics = {
    sessionActive: false,
    supportedMethods: [],
    supportedEvents: [],
    errors: [],
    warnings: []
  };

  try {
    // Check if service is available
    if (!walletConnectService) {
      diagnostics.errors.push('WalletConnect service not available');
      return diagnostics;
    }

    // Check if SignClient is initialized
    const signClient = walletConnectService.signClient;
    if (!signClient) {
      diagnostics.errors.push('WalletConnect SignClient not initialized');
      return diagnostics;
    }

    // Check session topic
    const sessionTopic = walletConnectService.getSessionTopic();
    if (!sessionTopic) {
      diagnostics.errors.push('No active WalletConnect session topic');
      return diagnostics;
    }

    diagnostics.sessionTopic = sessionTopic;

    // Get active sessions
    const activeSessions = signClient.session.getAll();
    const activeSession = activeSessions.find((s: any) => s.topic === sessionTopic);

    if (!activeSession) {
      diagnostics.errors.push('WalletConnect session not found in active sessions');
      return diagnostics;
    }

    diagnostics.sessionActive = true;

    // Check session expiry
    if (activeSession.expiry) {
      diagnostics.sessionExpiry = activeSession.expiry;
      const now = Math.floor(Date.now() / 1000);
      if (activeSession.expiry < now) {
        diagnostics.errors.push('WalletConnect session has expired');
      } else if (activeSession.expiry - now < 3600) { // Less than 1 hour
        diagnostics.warnings.push('WalletConnect session expires soon');
      }
    }

    // Check EIP155 namespace
    const eip155Namespace = activeSession.namespaces?.eip155;
    if (!eip155Namespace) {
      diagnostics.errors.push('EIP155 namespace not found in session');
      return diagnostics;
    }

    // Extract supported methods
    diagnostics.supportedMethods = eip155Namespace.methods || [];
    diagnostics.supportedEvents = eip155Namespace.events || [];

    // Check required methods for Safe transactions
    const requiredMethods = ['eth_signTypedData_v4'];
    const missingMethods = requiredMethods.filter(method => 
      !diagnostics.supportedMethods.includes(method)
    );

    if (missingMethods.length > 0) {
      diagnostics.errors.push(`Missing required methods: ${missingMethods.join(', ')}`);
    }

    // Extract account and chain info
    const accounts = eip155Namespace.accounts || [];
    if (accounts.length === 0) {
      diagnostics.errors.push('No accounts found in session');
    } else {
      // Parse account format: eip155:1:0x123...
      const accountParts = accounts[0].split(':');
      if (accountParts.length >= 3) {
        diagnostics.chainId = parseInt(accountParts[1]);
        diagnostics.address = accountParts[2];

        // Check chain ID if expected
        if (expectedChainId && diagnostics.chainId !== expectedChainId) {
          diagnostics.warnings.push(
            `Chain ID mismatch: expected ${expectedChainId}, got ${diagnostics.chainId}`
          );
        }
      }
    }

    // Check supported chains
    const supportedChains = eip155Namespace.chains || [];
    if (expectedChainId) {
      const expectedChain = `eip155:${expectedChainId}`;
      if (!supportedChains.includes(expectedChain)) {
        diagnostics.warnings.push(
          `Expected chain ${expectedChain} not in supported chains: ${supportedChains.join(', ')}`
        );
      }
    }

  } catch (error) {
    diagnostics.errors.push(`Diagnostic error: ${error}`);
  }

  return diagnostics;
}

/**
 * Log WalletConnect diagnostics in a readable format
 */
export function logWalletConnectDiagnostics(
  diagnostics: WalletConnectDiagnostics,
  context: string = 'WalletConnect'
): void {
  console.group(`🔍 ${context} Diagnostics`);
  
  console.log('📊 Session Status:', diagnostics.sessionActive ? '✅ Active' : '❌ Inactive');
  
  if (diagnostics.sessionTopic) {
    console.log('🔗 Session Topic:', diagnostics.sessionTopic);
  }
  
  if (diagnostics.address) {
    console.log('👤 Address:', diagnostics.address);
  }
  
  if (diagnostics.chainId) {
    console.log('⛓️ Chain ID:', diagnostics.chainId);
  }
  
  if (diagnostics.sessionExpiry) {
    const expiryDate = new Date(diagnostics.sessionExpiry * 1000);
    console.log('⏰ Session Expiry:', expiryDate.toLocaleString());
  }
  
  console.log('🔧 Supported Methods:', diagnostics.supportedMethods);
  console.log('📡 Supported Events:', diagnostics.supportedEvents);
  
  if (diagnostics.errors.length > 0) {
    console.group('❌ Errors');
    diagnostics.errors.forEach(error => console.error(error));
    console.groupEnd();
  }
  
  if (diagnostics.warnings.length > 0) {
    console.group('⚠️ Warnings');
    diagnostics.warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }
  
  console.groupEnd();
}

/**
 * Pre-flight check for WalletConnect signing operations
 */
export function preflightCheckWalletConnectSigning(
  walletConnectService: any,
  expectedChainId?: number
): { canSign: boolean; issues: string[] } {
  const diagnostics = diagnoseWalletConnectSession(walletConnectService, expectedChainId);
  
  const issues: string[] = [...diagnostics.errors];
  
  // Add critical warnings as issues
  diagnostics.warnings.forEach(warning => {
    if (warning.includes('expired') || warning.includes('Chain ID mismatch')) {
      issues.push(warning);
    }
  });
  
  return {
    canSign: issues.length === 0,
    issues
  };
}
