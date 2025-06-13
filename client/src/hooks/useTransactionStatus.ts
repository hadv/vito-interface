import { useState, useEffect, useCallback, useRef } from 'react';
import { transactionService } from '../services/TransactionService';
import { OnChainTransactionStatus } from '../services/OnChainDataService';

export interface TransactionStatusHookResult {
  status: OnChainTransactionStatus | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

/**
 * Custom hook for monitoring transaction status with real-time updates
 */
export const useTransactionStatus = (
  safeTxHash: string | null,
  autoStart: boolean = true,
  pollInterval: number = 5000
): TransactionStatusHookResult => {
  const [status, setStatus] = useState<OnChainTransactionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const stopMonitoringRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!safeTxHash) return;

    setIsLoading(true);
    setError(null);

    try {
      const txStatus = await transactionService.getTransactionStatus(safeTxHash);
      setStatus(txStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction status');
      console.error('Error fetching transaction status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [safeTxHash]);

  const stopMonitoring = useCallback(() => {
    if (stopMonitoringRef.current) {
      stopMonitoringRef.current();
      stopMonitoringRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsMonitoring(false);
  }, []);

  const startMonitoring = useCallback(async () => {
    if (!safeTxHash || isMonitoring) return;

    setIsMonitoring(true);
    setError(null);

    try {
      const cleanup = await transactionService.monitorTransactionStatus(
        safeTxHash,
        (newStatus) => {
          setStatus(newStatus);
          setIsLoading(false);

          // Stop monitoring if transaction is executed or failed
          if (newStatus.status === 'executed' || newStatus.status === 'failed') {
            stopMonitoring();
          }
        },
        pollInterval
      );

      stopMonitoringRef.current = cleanup;
    } catch (err: any) {
      setError(err.message || 'Failed to start monitoring');
      setIsMonitoring(false);
      console.error('Error starting transaction monitoring:', err);
    }
  }, [safeTxHash, isMonitoring, pollInterval, stopMonitoring]);

  const refresh = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Initial fetch and auto-start monitoring
  useEffect(() => {
    if (safeTxHash) {
      fetchStatus();
      
      if (autoStart) {
        // Delay auto-start to avoid immediate polling
        timeoutRef.current = setTimeout(() => {
          startMonitoring();
        }, 1000);
      }
    }

    return () => {
      stopMonitoring();
    };
  }, [safeTxHash, autoStart, fetchStatus, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    status,
    isLoading,
    error,
    refresh,
    startMonitoring,
    stopMonitoring
  };
};

/**
 * Hook for monitoring multiple transactions
 */
export const useMultipleTransactionStatus = (
  safeTxHashes: string[],
  pollInterval: number = 10000
): {
  statuses: Record<string, OnChainTransactionStatus>;
  isLoading: boolean;
  errors: Record<string, string>;
  refresh: () => void;
} => {
  const [statuses, setStatuses] = useState<Record<string, OnChainTransactionStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAllStatuses = useCallback(async () => {
    if (safeTxHashes.length === 0) return;

    setIsLoading(true);
    const newStatuses: Record<string, OnChainTransactionStatus> = {};
    const newErrors: Record<string, string> = {};

    await Promise.all(
      safeTxHashes.map(async (txHash) => {
        try {
          const status = await transactionService.getTransactionStatus(txHash);
          newStatuses[txHash] = status;
        } catch (err: any) {
          newErrors[txHash] = err.message || 'Failed to fetch status';
          console.error(`Error fetching status for ${txHash}:`, err);
        }
      })
    );

    setStatuses(newStatuses);
    setErrors(newErrors);
    setIsLoading(false);
  }, [safeTxHashes]);

  const refresh = useCallback(() => {
    fetchAllStatuses();
  }, [fetchAllStatuses]);

  // Start polling
  useEffect(() => {
    fetchAllStatuses();

    if (safeTxHashes.length > 0) {
      intervalRef.current = setInterval(fetchAllStatuses, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [safeTxHashes, pollInterval, fetchAllStatuses]);

  return {
    statuses,
    isLoading,
    errors,
    refresh
  };
};

/**
 * Hook for real-time transaction history updates
 */
export const useTransactionHistory = (
  refreshInterval: number = 30000
): {
  transactions: any[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
} => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const history = await transactionService.getTransactionHistory();
      setTransactions(history);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction history');
      console.error('Error fetching transaction history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchHistory();

    // Set up periodic refresh
    intervalRef.current = setInterval(fetchHistory, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchHistory, refreshInterval]);

  return {
    transactions,
    isLoading,
    error,
    refresh
  };
};
