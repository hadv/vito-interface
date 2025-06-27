import React, { useState } from 'react'
import styled from 'styled-components'
import { useWallet } from '../../contexts/WalletContext'
import type { WalletType } from '../../types/wallet'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(4px);
`

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  
  &:hover {
    color: #374151;
  }
`

const WalletList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const WalletOption = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover:not(:disabled) {
    border-color: #3b82f6;
    background: #f8fafc;
  }
  
  &:disabled {
    cursor: not-allowed;
  }
`

const WalletIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  
  img {
    width: 32px;
    height: 32px;
    border-radius: 6px;
  }
  
  svg {
    width: 32px;
    height: 32px;
  }
`

const WalletInfo = styled.div`
  flex: 1;
  text-align: left;
`

const WalletName = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
`

const WalletDescription = styled.div`
  font-size: 14px;
  color: #6b7280;
`

const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

const ErrorMessage = styled.div`
  color: #dc2626;
  font-size: 14px;
  margin-top: 12px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
`

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

const walletOptions = [
  {
    id: 'metamask' as WalletType,
    name: 'MetaMask',
    description: 'Connect using MetaMask browser extension',
    icon: '🦊',
  },
  {
    id: 'walletconnect' as WalletType,
    name: 'WalletConnect',
    description: 'Connect using mobile wallet via QR code',
    icon: '📱',
  },
]

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectSigner, state } = useWallet()
  const [connectingWallet, setConnectingWallet] = useState<WalletType | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setConnectingWallet(null)
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleWalletSelect = async (walletType: WalletType) => {
    if (connectingWallet) return

    console.log(`🔗 WalletModal: Attempting to connect ${walletType}`)
    setConnectingWallet(walletType)
    setError(null)

    try {
      if (walletType === 'metamask') {
        // Direct MetaMask connection - bypass all the complex stuff
        if (!window.ethereum) {
          throw new Error('MetaMask is not installed')
        }

        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })

        if (accounts && accounts.length > 0) {
          console.log(`✅ WalletModal: MetaMask connected:`, accounts[0])
          onClose()
          // Force page reload to update state
          window.location.reload()
          return
        }
      } else {
        // For other wallets, use the existing method
        await connectSigner(walletType)
      }

      console.log(`✅ WalletModal: Successfully connected ${walletType}`)
      onClose()
    } catch (err) {
      console.error(`❌ WalletModal: Failed to connect ${walletType}:`, err)

      // Handle different error types
      let errorMessage = 'Failed to connect wallet'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        if ('userMessage' in err) {
          errorMessage = err.userMessage as string
        } else if ('message' in err) {
          errorMessage = err.message as string
        }
      }

      setError(errorMessage)
    } finally {
      setConnectingWallet(null)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Connect Wallet</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <WalletList>
          {walletOptions.map((wallet) => {
            const isConnecting = connectingWallet === wallet.id
            const isDisabled = !!connectingWallet && !isConnecting

            return (
              <WalletOption
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet.id)}
                disabled={isDisabled}
              >
                <WalletIcon>
                  <span style={{ fontSize: '24px' }}>{wallet.icon}</span>
                </WalletIcon>
                <WalletInfo>
                  <WalletName>{wallet.name}</WalletName>
                  <WalletDescription>{wallet.description}</WalletDescription>
                </WalletInfo>
                {isConnecting && <LoadingSpinner />}
              </WalletOption>
            )
          })}
        </WalletList>

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </ModalContent>
    </ModalOverlay>
  )
}
