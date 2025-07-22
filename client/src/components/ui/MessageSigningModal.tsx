import React, { useState, useEffect } from 'react';
import { dAppWalletConnectService } from '../../services/DAppWalletConnectService';

interface MessageSigningRequest {
  messageHash: string;
  message: string;
  signatures: string[];
  isExecuted: boolean;
  confirmations: number;
  threshold: number;
}

interface MessageSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MessageSigningModal: React.FC<MessageSigningModalProps> = ({ isOpen, onClose }) => {
  const [allMessages, setAllMessages] = useState<MessageSigningRequest[]>([]);
  const [pendingMessages, setPendingMessages] = useState<MessageSigningRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [signingMessage, setSigningMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Load messages when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const [pending, all] = await Promise.all([
        dAppWalletConnectService.getPendingMessages(),
        dAppWalletConnectService.getAllMessages()
      ]);
      setPendingMessages(pending);
      setAllMessages(all);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignMessage = async (messageHash: string, message: string) => {
    setSigningMessage(messageHash);
    try {
      await dAppWalletConnectService.signPendingMessage(messageHash, message);
      // Reload messages to show updated signature count
      await loadMessages();
    } catch (error: any) {
      console.error('Failed to sign message:', error);
      alert(`Failed to sign message: ${error.message}`);
    } finally {
      setSigningMessage(null);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Message Signatures
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setShowHistory(false)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              !showHistory
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending ({pendingMessages.length})
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              showHistory
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            History ({allMessages.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading messages...</span>
            </div>
          ) : (() => {
            const messagesToShow = showHistory ? allMessages : pendingMessages;
            const emptyMessage = showHistory ? 'No message history' : 'No pending message signatures';
            const emptySubMessage = showHistory
              ? 'Executed message signatures will appear here'
              : 'Message signing requests from dApps will appear here';

            return messagesToShow.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-600">{emptyMessage}</p>
                <p className="text-sm text-gray-500 mt-1">{emptySubMessage}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messagesToShow.map((messageRequest) => (
                <div
                  key={messageRequest.messageHash}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  {/* Message Info */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">Message Signing Request</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          messageRequest.isExecuted 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {messageRequest.isExecuted ? 'Executed' : 'Pending'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {messageRequest.confirmations}/{messageRequest.threshold} signatures
                        </span>
                      </div>
                    </div>
                    
                    {/* Message Content */}
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-sm text-gray-600 mb-1">Message:</p>
                      <p className="text-sm font-mono text-gray-900 break-all">
                        {messageRequest.message.length > 200 
                          ? `${messageRequest.message.substring(0, 200)}...` 
                          : messageRequest.message
                        }
                      </p>
                    </div>

                    {/* Message Hash */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Message Hash:</p>
                      <p className="text-xs font-mono text-gray-500 break-all">
                        {messageRequest.messageHash}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Signature Progress</span>
                      <span>{messageRequest.confirmations}/{messageRequest.threshold}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          messageRequest.isExecuted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ 
                          width: `${Math.min((messageRequest.confirmations / messageRequest.threshold) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3">
                    {!showHistory && !messageRequest.isExecuted && (
                      <button
                        onClick={() => handleSignMessage(messageRequest.messageHash, messageRequest.message)}
                        disabled={signingMessage === messageRequest.messageHash}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {signingMessage === messageRequest.messageHash ? (
                          <span className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Signing...
                          </span>
                        ) : (
                          'Sign Message'
                        )}
                      </button>
                    )}
                    {showHistory && messageRequest.isExecuted && (
                      <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                        ✓ Executed
                      </span>
                    )}
                  </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {showHistory
              ? `${allMessages.length} total message${allMessages.length !== 1 ? 's' : ''}`
              : `${pendingMessages.length} pending message${pendingMessages.length !== 1 ? 's' : ''}`
            }
          </p>
          <div className="flex space-x-3">
            <button
              onClick={loadMessages}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
