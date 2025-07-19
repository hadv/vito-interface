/**
 * Debug utilities for TransactionModal issues
 * Helps diagnose problems with native ETH transaction creation after ERC20 transactions
 */

import { Asset } from '../components/wallet/types';

export interface TransactionModalState {
  isOpen: boolean;
  toAddress: string;
  amount: string;
  preSelectedAsset: Asset | null;
  currentStep: 'form' | 'proposing';
  error: string;
  isLoading: boolean;
}

export interface TransactionModalDiagnostics {
  formState: TransactionModalState;
  validationIssues: string[];
  uiIssues: string[];
  recommendations: string[];
}

/**
 * Diagnose TransactionModal state and identify potential issues
 */
export function diagnoseTransactionModal(state: TransactionModalState): TransactionModalDiagnostics {
  const validationIssues: string[] = [];
  const uiIssues: string[] = [];
  const recommendations: string[] = [];

  // Check form state
  if (state.isOpen && !state.toAddress && !state.amount) {
    uiIssues.push('Modal is open but form fields are empty');
  }

  // Check preSelectedAsset consistency
  if (state.preSelectedAsset) {
    if (state.preSelectedAsset.type === 'native') {
      if (state.preSelectedAsset.symbol !== 'ETH') {
        validationIssues.push(`Native asset should have ETH symbol, got: ${state.preSelectedAsset.symbol}`);
      }
      if (state.preSelectedAsset.contractAddress) {
        validationIssues.push('Native ETH asset should not have contractAddress');
      }
    } else if (state.preSelectedAsset.type === 'erc20') {
      if (!state.preSelectedAsset.contractAddress) {
        validationIssues.push('ERC20 asset missing contractAddress');
      }
      if (state.preSelectedAsset.symbol === 'ETH') {
        validationIssues.push('ERC20 asset should not have ETH symbol');
      }
    }
  }

  // Check form validation
  if (state.toAddress && !isValidEthereumAddress(state.toAddress)) {
    validationIssues.push('Invalid recipient address format');
  }

  if (state.amount) {
    const numAmount = parseFloat(state.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      validationIssues.push('Invalid amount value');
    }

    // Check ETH amount parsing for native transactions
    if (!state.preSelectedAsset || state.preSelectedAsset.type === 'native') {
      try {
        const { ethers } = require('ethers');
        ethers.utils.parseEther(state.amount);
      } catch (error) {
        validationIssues.push(`ETH amount parsing failed: ${error}`);
      }
    }
  }

  // Generate recommendations
  if (validationIssues.length > 0) {
    recommendations.push('Fix validation issues before proceeding');
  }

  if (uiIssues.length > 0) {
    recommendations.push('Check modal state management and form reset logic');
  }

  if (state.preSelectedAsset?.type === 'native' && state.error) {
    recommendations.push('Check if error is preventing native ETH transaction creation');
    recommendations.push('Verify that form reset properly clears previous ERC20 transaction state');
  }

  return {
    formState: state,
    validationIssues,
    uiIssues,
    recommendations
  };
}

/**
 * Simple Ethereum address validation
 */
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Log TransactionModal diagnostics in a readable format
 */
export function logTransactionModalDiagnostics(
  diagnostics: TransactionModalDiagnostics,
  context: string = 'TransactionModal'
): void {
  console.group(`🔍 ${context} Diagnostics`);
  
  console.log('📊 Form State:', {
    isOpen: diagnostics.formState.isOpen,
    currentStep: diagnostics.formState.currentStep,
    hasToAddress: !!diagnostics.formState.toAddress,
    hasAmount: !!diagnostics.formState.amount,
    assetType: diagnostics.formState.preSelectedAsset?.type || 'none',
    assetSymbol: diagnostics.formState.preSelectedAsset?.symbol || 'none',
    hasError: !!diagnostics.formState.error,
    isLoading: diagnostics.formState.isLoading
  });
  
  if (diagnostics.formState.preSelectedAsset) {
    console.log('💰 Selected Asset:', diagnostics.formState.preSelectedAsset);
  }
  
  if (diagnostics.validationIssues.length > 0) {
    console.group('❌ Validation Issues');
    diagnostics.validationIssues.forEach(issue => console.error(issue));
    console.groupEnd();
  }
  
  if (diagnostics.uiIssues.length > 0) {
    console.group('⚠️ UI Issues');
    diagnostics.uiIssues.forEach(issue => console.warn(issue));
    console.groupEnd();
  }
  
  if (diagnostics.recommendations.length > 0) {
    console.group('💡 Recommendations');
    diagnostics.recommendations.forEach(rec => console.log(rec));
    console.groupEnd();
  }
  
  console.groupEnd();
}

/**
 * Create a test state for debugging
 */
export function createTestTransactionModalState(
  assetType: 'native' | 'erc20' = 'native'
): TransactionModalState {
  const nativeAsset: Asset = {
    type: 'native',
    symbol: 'ETH',
    name: 'Ethereum',
    balance: '1.5',
    value: '$3000',
    decimals: 18
  };

  const erc20Asset: Asset = {
    type: 'erc20',
    symbol: 'USDC',
    name: 'USD Coin',
    balance: '1000',
    value: '$1000',
    contractAddress: '0xA0b86a33E6441b8C4505B8C4505B8C4505B8C4505',
    decimals: 6
  };

  return {
    isOpen: true,
    toAddress: '0x742d35Cc6634C0532925a3b8D4C4505B8C4505B8C',
    amount: '0.1',
    preSelectedAsset: assetType === 'native' ? nativeAsset : erc20Asset,
    currentStep: 'form',
    error: '',
    isLoading: false
  };
}

/**
 * Test TransactionModal state transitions
 */
export function testTransactionModalStateTransitions(): void {
  console.group('🧪 TransactionModal State Transition Tests');
  
  // Test 1: Native ETH transaction
  console.log('📝 Test 1: Native ETH Transaction');
  const nativeState = createTestTransactionModalState('native');
  const nativeDiagnostics = diagnoseTransactionModal(nativeState);
  logTransactionModalDiagnostics(nativeDiagnostics, 'Native ETH Test');
  
  // Test 2: ERC20 transaction
  console.log('📝 Test 2: ERC20 Transaction');
  const erc20State = createTestTransactionModalState('erc20');
  const erc20Diagnostics = diagnoseTransactionModal(erc20State);
  logTransactionModalDiagnostics(erc20Diagnostics, 'ERC20 Test');
  
  // Test 3: Transition from ERC20 to Native (potential issue scenario)
  console.log('📝 Test 3: ERC20 to Native Transition');
  const transitionState = {
    ...createTestTransactionModalState('native'),
    // Simulate potential state pollution from previous ERC20 transaction
    error: 'Previous ERC20 error not cleared'
  };
  const transitionDiagnostics = diagnoseTransactionModal(transitionState);
  logTransactionModalDiagnostics(transitionDiagnostics, 'Transition Test');
  
  console.groupEnd();
}
