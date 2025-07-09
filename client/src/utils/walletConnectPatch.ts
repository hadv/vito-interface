/**
 * WalletConnect Aggressive Error Suppression Patch
 * 
 * This module patches WalletConnect at the lowest level to prevent
 * "No matching key" errors from ever being thrown.
 */

// Store original methods for fallback
const originalMethods = new Map();

/**
 * Patch any object method to suppress WalletConnect errors
 */
function patchMethod(obj: any, methodName: string, patchName: string) {
  if (!obj || typeof obj[methodName] !== 'function') return;

  const originalMethod = obj[methodName];
  const key = `${patchName}.${methodName}`;
  
  if (originalMethods.has(key)) return; // Already patched
  
  originalMethods.set(key, originalMethod);
  
  obj[methodName] = function(...args: any[]) {
    try {
      const result = originalMethod.apply(this, args);
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result.catch((error: any) => {
          const errorMessage = error?.message?.toLowerCase() || '';
          if (errorMessage.includes('no matching key') || 
              errorMessage.includes('session') && errorMessage.includes('exist')) {
            console.warn(`🛡️ Suppressed WalletConnect error in ${key}:`, error.message);
            return null; // Return null instead of throwing
          }
          throw error; // Re-throw other errors
        });
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('no matching key') ||
          (errorMessage.includes('session') && errorMessage.includes('exist'))) {
        console.warn(`🛡️ Suppressed WalletConnect error in ${key}:`, error.message);
        return null; // Return null instead of throwing
      }
      throw error; // Re-throw other errors
    }
  };
}

/**
 * Patch WalletConnect SignClient when it's created
 */
function patchSignClient(signClient: any) {
  if (!signClient) return;

  console.log('🔧 Patching WalletConnect SignClient methods...');

  // Patch main client methods
  patchMethod(signClient, 'isValidSessionOrPairingTopic', 'SignClient');
  patchMethod(signClient, 'isValidDisconnect', 'SignClient');
  patchMethod(signClient, 'deleteSession', 'SignClient');
  patchMethod(signClient, 'onSessionDeleteRequest', 'SignClient');
  patchMethod(signClient, 'processRequest', 'SignClient');
  patchMethod(signClient, 'onRelayMessage', 'SignClient');

  // Patch session store methods
  if (signClient.session) {
    patchMethod(signClient.session, 'get', 'Session');
    patchMethod(signClient.session, 'delete', 'Session');
    patchMethod(signClient.session, 'set', 'Session');
    patchMethod(signClient.session, 'update', 'Session');
  }

  // Patch pairing store methods
  if (signClient.pairing) {
    patchMethod(signClient.pairing, 'get', 'Pairing');
    patchMethod(signClient.pairing, 'delete', 'Pairing');
    patchMethod(signClient.pairing, 'set', 'Pairing');
    patchMethod(signClient.pairing, 'update', 'Pairing');
  }

  // Patch core relayer methods
  if (signClient.core?.relayer) {
    patchMethod(signClient.core.relayer, 'onRelayMessage', 'Relayer');
    patchMethod(signClient.core.relayer, 'onProviderMessageEvent', 'Relayer');
  }

  console.log('✅ WalletConnect SignClient patched successfully');
}

/**
 * Monitor for WalletConnect SignClient creation and patch it
 */
function monitorSignClientCreation() {
  // Patch SignClient.init method
  const originalSignClientInit = (window as any).SignClient?.init;
  if (originalSignClientInit) {
    (window as any).SignClient.init = async function(...args: any[]) {
      console.log('🔍 Intercepting SignClient.init...');
      const signClient = await originalSignClientInit.apply(this, args);
      patchSignClient(signClient);
      return signClient;
    };
  }

  // Monitor for dynamic SignClient creation through periodic checks
  // (Removed eval patching due to security concerns)
}

/**
 * Initialize the WalletConnect patch system
 */
export function initializeWalletConnectPatch() {
  console.log('🛡️ Initializing WalletConnect error suppression patch...');

  // Monitor for SignClient creation
  monitorSignClientCreation();

  // Patch any existing SignClient
  if ((window as any).SignClient) {
    monitorSignClientCreation();
  }

  // Set up a periodic check for new SignClient instances
  const checkInterval = setInterval(() => {
    if ((window as any).SignClient && !(window as any).SignClient._patched) {
      (window as any).SignClient._patched = true;
      monitorSignClientCreation();
    }
  }, 1000);

  // Clean up after 30 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 30000);

  console.log('✅ WalletConnect patch system initialized');
}

/**
 * Export the patch function for manual use
 */
export { patchSignClient };
