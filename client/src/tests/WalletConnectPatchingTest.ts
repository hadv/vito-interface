/**
 * Test to verify WalletConnect internal method patching is working
 * This will help us understand why the "No matching key" errors are still occurring
 */

import { WalletConnectService } from '../services/WalletConnectService';
import { DAppWalletConnectService } from '../services/DAppWalletConnectService';

export class WalletConnectPatchingTest {
  private walletConnectService: WalletConnectService;
  private dappService: DAppWalletConnectService;

  constructor() {
    this.walletConnectService = new WalletConnectService();
    this.dappService = new DAppWalletConnectService();
  }

  /**
   * Test if our patching is actually working
   */
  async testPatching(): Promise<void> {
    console.log('🧪 Starting WalletConnect Patching Test...');

    // Wait for services to initialize
    await this.waitForInitialization();

    // Test WalletConnectService patching
    await this.testWalletConnectServicePatching();

    // Test DAppWalletConnectService patching
    await this.testDAppServicePatching();

    // Test cross-service session handling
    await this.testCrossServiceSessionHandling();

    console.log('🧪 WalletConnect Patching Test Complete');
  }

  private async waitForInitialization(): Promise<void> {
    console.log('⏳ Waiting for services to initialize...');
    
    // Wait up to 10 seconds for initialization
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      const wcClient = (this.walletConnectService as any).signClient;
      const dappClient = (this.dappService as any).signClient;
      
      if (wcClient && dappClient) {
        console.log('✅ Both services initialized');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    console.warn('⚠️ Services may not be fully initialized');
  }

  private async testWalletConnectServicePatching(): Promise<void> {
    console.log('🔍 Testing WalletConnectService patching...');

    const signClient = (this.walletConnectService as any).signClient;
    if (!signClient) {
      console.error('❌ WalletConnectService signClient not available');
      return;
    }

    // First, let's see what methods are actually available
    console.log('📋 Available methods on WalletConnectService signClient:');
    console.log('- getActiveSessions:', typeof signClient.getActiveSessions);
    console.log('- isValidSessionOrPairingTopic:', typeof signClient.isValidSessionOrPairingTopic);
    console.log('- isValidDisconnect:', typeof signClient.isValidDisconnect);
    console.log('- session:', !!signClient.session);
    console.log('- session.store:', !!signClient.session?.store);
    console.log('- session.store.get:', typeof signClient.session?.store?.get);
    console.log('- session.store.getData:', typeof signClient.session?.store?.getData);

    // Test isValidSessionOrPairingTopic patching
    await this.testMethod(
      signClient,
      'isValidSessionOrPairingTopic',
      'fake-topic-123',
      'WalletConnectService'
    );

    // Test isValidDisconnect patching
    await this.testMethod(
      signClient,
      'isValidDisconnect',
      { topic: 'fake-topic-123', reason: { code: 6000, message: 'Test' } },
      'WalletConnectService'
    );

    // Test session store patching
    if (signClient.session?.store) {
      await this.testMethod(
        signClient.session.store,
        'get',
        'fake-topic-123',
        'WalletConnectService session.store'
      );

      await this.testMethod(
        signClient.session.store,
        'getData',
        'fake-topic-123',
        'WalletConnectService session.store'
      );
    }
  }

  private async testDAppServicePatching(): Promise<void> {
    console.log('🔍 Testing DAppWalletConnectService patching...');

    const signClient = (this.dappService as any).signClient;
    if (!signClient) {
      console.error('❌ DAppWalletConnectService signClient not available');
      return;
    }

    // First, let's see what methods are actually available
    console.log('📋 Available methods on DAppWalletConnectService signClient:');
    console.log('- getActiveSessions:', typeof signClient.getActiveSessions);
    console.log('- isValidSessionOrPairingTopic:', typeof signClient.isValidSessionOrPairingTopic);
    console.log('- isValidDisconnect:', typeof signClient.isValidDisconnect);
    console.log('- session:', !!signClient.session);
    console.log('- session.store:', !!signClient.session?.store);
    console.log('- session.store.get:', typeof signClient.session?.store?.get);
    console.log('- session.store.getData:', typeof signClient.session?.store?.getData);

    // Test isValidSessionOrPairingTopic patching
    await this.testMethod(
      signClient,
      'isValidSessionOrPairingTopic',
      'fake-topic-456',
      'DAppWalletConnectService'
    );

    // Test isValidDisconnect patching
    await this.testMethod(
      signClient,
      'isValidDisconnect',
      { topic: 'fake-topic-456', reason: { code: 6000, message: 'Test' } },
      'DAppWalletConnectService'
    );

    // Test session store patching
    if (signClient.session?.store) {
      await this.testMethod(
        signClient.session.store,
        'get',
        'fake-topic-456',
        'DAppWalletConnectService session.store'
      );

      await this.testMethod(
        signClient.session.store,
        'getData',
        'fake-topic-456',
        'DAppWalletConnectService session.store'
      );
    }
  }

  private async testMethod(
    object: any,
    methodName: string,
    testParam: any,
    serviceName: string
  ): Promise<void> {
    try {
      console.log(`🧪 Testing ${serviceName}.${methodName}...`);
      
      if (!object[methodName]) {
        console.warn(`⚠️ Method ${methodName} not found on ${serviceName}`);
        return;
      }

      const result = object[methodName](testParam);
      console.log(`✅ ${serviceName}.${methodName} returned:`, result);
      
      // If it's a promise, wait for it
      if (result && typeof result.then === 'function') {
        try {
          const resolvedResult = await result;
          console.log(`✅ ${serviceName}.${methodName} resolved to:`, resolvedResult);
        } catch (error) {
          console.log(`🛡️ ${serviceName}.${methodName} promise rejected (expected):`, (error as Error).message);
        }
      }
      
    } catch (error) {
      console.log(`🛡️ ${serviceName}.${methodName} threw error (expected):`, (error as Error).message);
    }
  }

  private async testCrossServiceSessionHandling(): Promise<void> {
    console.log('🔍 Testing cross-service session handling...');
    
    const wcClient = (this.walletConnectService as any).signClient;
    const dappClient = (this.dappService as any).signClient;
    
    if (!wcClient || !dappClient) {
      console.error('❌ One or both clients not available for cross-service test');
      return;
    }

    // Get active sessions from both services
    try {
      const wcSessions = wcClient.getActiveSessions();
      const dappSessions = dappClient.getActiveSessions();
      
      console.log('📊 WalletConnectService active sessions:', Object.keys(wcSessions));
      console.log('📊 DAppWalletConnectService active sessions:', Object.keys(dappSessions));
      
      // Test if services can handle each other's session topics
      const allTopics = [...Object.keys(wcSessions), ...Object.keys(dappSessions)];
      
      for (const topic of allTopics) {
        console.log(`🧪 Testing topic ${topic} across services...`);
        
        // Test WalletConnectService with this topic
        try {
          const wcOwns = (this.walletConnectService as any).ownsSession(topic);
          console.log(`📋 WalletConnectService owns ${topic}:`, wcOwns);
        } catch (error) {
          console.error(`❌ WalletConnectService.ownsSession failed:`, (error as Error).message);
        }
        
        // Test DAppWalletConnectService with this topic
        try {
          const dappOwns = (this.dappService as any).ownsSession(topic);
          console.log(`📋 DAppWalletConnectService owns ${topic}:`, dappOwns);
        } catch (error) {
          console.error(`❌ DAppWalletConnectService.ownsSession failed:`, (error as Error).message);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to get active sessions:', (error as Error).message);
    }
  }

  /**
   * Simulate a session delete event to see if our patching works
   */
  async simulateSessionDeleteEvent(topic: string): Promise<void> {
    console.log(`🎭 Simulating session delete event for topic: ${topic}`);
    
    const wcClient = (this.walletConnectService as any).signClient;
    const dappClient = (this.dappService as any).signClient;
    
    if (wcClient) {
      try {
        console.log('🧪 Testing WalletConnectService session delete handling...');
        
        // Try to trigger the same validation that causes the error
        if (wcClient.isValidSessionOrPairingTopic) {
          const isValid = wcClient.isValidSessionOrPairingTopic(topic);
          console.log(`✅ WalletConnectService.isValidSessionOrPairingTopic(${topic}):`, isValid);
        }
        
        if (wcClient.isValidDisconnect) {
          const isValidDisconnect = wcClient.isValidDisconnect({ topic, reason: { code: 6000, message: 'Test' } });
          console.log(`✅ WalletConnectService.isValidDisconnect(${topic}):`, isValidDisconnect);
        }
        
      } catch (error) {
        console.error(`❌ WalletConnectService validation failed:`, (error as Error).message);
      }
    }
    
    if (dappClient) {
      try {
        console.log('🧪 Testing DAppWalletConnectService session delete handling...');
        
        // Try to trigger the same validation that causes the error
        if (dappClient.isValidSessionOrPairingTopic) {
          const isValid = dappClient.isValidSessionOrPairingTopic(topic);
          console.log(`✅ DAppWalletConnectService.isValidSessionOrPairingTopic(${topic}):`, isValid);
        }
        
        if (dappClient.isValidDisconnect) {
          const isValidDisconnect = dappClient.isValidDisconnect({ topic, reason: { code: 6000, message: 'Test' } });
          console.log(`✅ DAppWalletConnectService.isValidDisconnect(${topic}):`, isValidDisconnect);
        }
        
      } catch (error) {
        console.error(`❌ DAppWalletConnectService validation failed:`, (error as Error).message);
      }
    }
  }
}

// Export a function to run the test from browser console
(window as any).testWalletConnectPatching = async () => {
  const test = new WalletConnectPatchingTest();
  await test.testPatching();
  
  // Also test with the specific topic from the error
  await test.simulateSessionDeleteEvent('247fcb601664d3ecfcbeb76bc78f4ff13985185f50be155a76049bff2cc7034d');
};

console.log('🧪 WalletConnect Patching Test loaded. Run testWalletConnectPatching() in console to test.');
