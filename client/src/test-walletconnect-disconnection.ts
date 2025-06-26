/**
 * Test script to verify WalletConnect bidirectional disconnection
 * This script can be used to manually test the disconnection functionality
 */

import { walletConnectionService } from './services/WalletConnectionService';
import { walletConnectService } from './services/WalletConnectService';

// Test function to simulate mobile wallet disconnection
export async function testMobileWalletDisconnection() {
  console.log('🧪 Testing mobile wallet disconnection simulation...');
  
  // Check if WalletConnect is connected
  if (!walletConnectService.isConnected()) {
    console.log('❌ WalletConnect is not connected. Please connect first.');
    return;
  }

  // Get current state
  const currentState = walletConnectionService.getState();
  console.log('📊 Current state:', currentState);

  // Simulate mobile wallet disconnection by emitting the event
  try {
    // This simulates what happens when the mobile wallet disconnects
    (walletConnectService as any).emit('session_disconnected', { 
      topic: walletConnectService.getSessionTopic(),
      reason: 'mobile_disconnect_test' 
    });
    
    console.log('✅ Mobile wallet disconnection event emitted');
    
    // Wait a bit for the event to be processed
    setTimeout(() => {
      const newState = walletConnectionService.getState();
      console.log('📊 New state after disconnection:', newState);
      
      if (!newState.signerConnected && newState.readOnlyMode) {
        console.log('✅ Test passed: App correctly handled mobile wallet disconnection');
      } else {
        console.log('❌ Test failed: App did not handle mobile wallet disconnection correctly');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Test function to verify app-initiated disconnection
export async function testAppInitiatedDisconnection() {
  console.log('🧪 Testing app-initiated disconnection...');
  
  // Check if WalletConnect is connected
  if (!walletConnectService.isConnected()) {
    console.log('❌ WalletConnect is not connected. Please connect first.');
    return;
  }

  // Get current state
  const currentState = walletConnectionService.getState();
  console.log('📊 Current state:', currentState);

  try {
    // Test disconnecting from the app side
    await walletConnectionService.disconnectSignerWallet();
    
    console.log('✅ App-initiated disconnection completed');
    
    // Check if WalletConnect session was also disconnected
    const isStillConnected = walletConnectService.isConnected();
    const newState = walletConnectionService.getState();
    
    console.log('📊 WalletConnect still connected:', isStillConnected);
    console.log('📊 New state after disconnection:', newState);
    
    if (!isStillConnected && !newState.signerConnected && newState.readOnlyMode) {
      console.log('✅ Test passed: App correctly disconnected both locally and on WalletConnect');
    } else {
      console.log('❌ Test failed: Disconnection was not complete');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Test function to verify session validation
export async function testSessionValidation() {
  console.log('🧪 Testing session validation...');
  
  const sessionTopic = walletConnectService.getSessionTopic();
  console.log('📊 Current session topic:', sessionTopic);
  
  if (!sessionTopic) {
    console.log('❌ No session topic available');
    return;
  }

  try {
    const isValid = await walletConnectService.isSessionValid();
    console.log('📊 Session is valid:', isValid);
    
    if (isValid) {
      console.log('✅ Session validation test passed');
    } else {
      console.log('❌ Session validation test failed - session is not valid');
    }
    
  } catch (error) {
    console.error('❌ Session validation test failed with error:', error);
  }
}

// Main test runner
export async function runWalletConnectDisconnectionTests() {
  console.log('🚀 Starting WalletConnect disconnection tests...');
  
  // Test 1: Session validation
  await testSessionValidation();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Mobile wallet disconnection simulation
  await testMobileWalletDisconnection();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 3: App-initiated disconnection (only if still connected)
  if (walletConnectService.isConnected()) {
    await testAppInitiatedDisconnection();
  }
  
  console.log('🏁 WalletConnect disconnection tests completed');
}

// Export for use in browser console
(window as any).testWalletConnectDisconnection = {
  runAll: runWalletConnectDisconnectionTests,
  testMobile: testMobileWalletDisconnection,
  testApp: testAppInitiatedDisconnection,
  testValidation: testSessionValidation
};

console.log('🔧 WalletConnect disconnection test functions loaded. Use:');
console.log('- testWalletConnectDisconnection.runAll() - Run all tests');
console.log('- testWalletConnectDisconnection.testMobile() - Test mobile disconnection');
console.log('- testWalletConnectDisconnection.testApp() - Test app disconnection');
console.log('- testWalletConnectDisconnection.testValidation() - Test session validation');
