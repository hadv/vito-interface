/**
 * Formats a wallet address to a shortened display format (0x1234...abcd)
 * @param address The full wallet address
 * @returns The formatted wallet address
 */
export const formatWalletAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

/**
 * Formats a token amount with its symbol
 * @param amount The token amount
 * @param symbol The token symbol
 * @returns Formatted token amount with symbol
 */
export const formatTokenAmount = (amount: string | number, symbol: string): string => {
  return `${amount} ${symbol}`;
};

/**
 * Formats a transaction amount based on token type
 * @param amount The transaction amount
 * @param symbol The token symbol
 * @returns Formatted transaction amount
 */
export const formatTransactionAmount = (amount: string | number, symbol: string): string => {
  return `${amount} ${symbol}`;
};

/**
 * Gets token icon letter (first letter of the symbol)
 * @param symbol The token symbol
 * @returns First letter of the symbol for the icon
 */
export const getTokenIconLetter = (symbol: string): string => {
  return symbol.charAt(0);
};

/**
 * Gets readable token type label
 * @param type Token type ('native' or 'erc20')
 * @returns Human-readable token type label
 */
export const getTokenTypeLabel = (type: 'native' | 'erc20'): string => {
  return type === 'native' ? 'Native Token' : 'ERC-20 Token';
};

/**
 * Generates a URL for an Etherscan address page
 * @param address The wallet address
 * @param network The network (e.g., 'ethereum', 'sepolia', 'arbitrum')
 * @returns URL to view the address on Etherscan
 */
export const getEtherscanAddressUrl = (address: string, network: string): string => {
  switch(network.toLowerCase()) {
    case 'arbitrum':
      return `https://arbiscan.io/address/${address}`;
    case 'sepolia':
      return `https://sepolia.etherscan.io/address/${address}`;
    case 'ethereum':
    default:
      return `https://etherscan.io/address/${address}`;
  }
};

/**
 * Generates a URL for an Etherscan transaction page
 * @param txHash The transaction hash
 * @param network The network (e.g., 'ethereum', 'sepolia', 'arbitrum')
 * @returns URL to view the transaction on Etherscan
 */
export const getEtherscanTransactionUrl = (txHash: string, network: string): string => {
  switch(network.toLowerCase()) {
    case 'arbitrum':
      return `https://arbiscan.io/tx/${txHash}`;
    case 'sepolia':
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    case 'ethereum':
    default:
      return `https://etherscan.io/tx/${txHash}`;
  }
};

/**
 * Generates a URL for Safe transaction details
 * @param safeAddress The Safe address
 * @param safeTxHash The Safe transaction hash
 * @param network The network (e.g., 'ethereum', 'sepolia', 'arbitrum')
 * @returns URL to view the Safe transaction
 */
export const getSafeTransactionUrl = (safeAddress: string, safeTxHash: string, network: string): string => {
  const networkPrefix = network.toLowerCase() === 'ethereum' ? '' : `${network.toLowerCase()}.`;
  return `https://${networkPrefix}app.safe.global/transactions/tx?safe=${network.toLowerCase()}:${safeAddress}&id=multisig_${safeAddress}_${safeTxHash}`;
};

/**
 * Generates a QR code URL for a wallet address with blue theme
 * Using QR Server which is more reliable than Google Charts API
 * @param address The wallet address
 * @param size Size of the QR code image
 * @returns URL for a QR code image of the address with blue styling
 */
export const getQRCodeUrl = (address: string, size: number = 200): string => {
  const foregroundColor = '3b82f6'; // Blue color (without #)
  const backgroundColor = 'ffffff'; // White background
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(address)}&size=${size}x${size}&color=${foregroundColor}&bgcolor=${backgroundColor}&margin=10`;
};

/**
 * Generates a unique Identicon avatar from a wallet address (32x32)
 * @param address The wallet address to generate avatar from
 * @returns Data URI string for the identicon
 */
export const generateWalletAvatar = (address: string): string => {
  if (!address || address.length < 10) return '';
  
  // Use parts of the address as seeds for colors and pixels
  const hash = address.toLowerCase().replace(/^0x/, '');
  
  // Generate colors from the address
  const hue = parseInt(hash.substring(0, 2), 16) % 360;
  const saturation = 70 + parseInt(hash.substring(2, 4), 16) % 30;
  const lightness = 45 + parseInt(hash.substring(4, 6), 16) % 20;
  
  // Generate background color
  const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  // Generate foreground color (slightly darker than background)
  const fgColor = `hsl(${hue}, ${saturation}%, ${Math.max(lightness - 20, 10)}%)`;
  
  // Create a symmetrical 5x5 grid pattern (which will mirror for 8x8 total)
  const grid = [];
  for (let i = 0; i < 15; i++) {
    // Only need to generate half the grid because we'll mirror it
    const byteVal = parseInt(hash.substring(i, i + 1), 16);
    grid.push(byteVal > 7 ? 1 : 0); // 50% chance of a cell being filled
  }
  
  // Create SVG for identicon (32x32 pixels)
  const cellSize = 4; // 8x8 grid in 32x32 pixels
  let svg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="${bgColor}" />`;
  
  // Add pixels to the grid (with mirroring for symmetry)
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const i = y * 3 + x;
      if (i < grid.length && grid[i]) {
        // Draw left side
        svg += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fgColor}" />`;
        // Mirror to right side (7-x to count from right edge)
        svg += `<rect x="${(7-x) * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fgColor}" />`;
      }
    }
  }
  
  svg += '</svg>';
  
  // Convert SVG to data URI
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}; 