# Vito Safe{Wallet}

A secure and efficient static web application designed to interact with Safe{Wallet} through a minimalist interface. Fully client-side with no backend dependencies.

## Features

- **Static Deployment**: No server required - deploy anywhere
- **Safe Wallet Management**: Connect and manage Safe wallets
- **Multi-Network Support**: Ethereum, Sepolia, Arbitrum
- **WalletConnect Integration**: Connect mobile wallets via QR codes
- **Web3Auth Social Login**: Google OAuth integration
- **Transaction Management**: View, create, and execute transactions
- **Address Book**: Manage trusted addresses
- **PWA Support**: Mobile app-like experience

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Wallet Integration**: WalletConnect v2, Web3Auth, Ethers.js
- **Build System**: Create React App with custom webpack config
- **Deployment**: Static files (HTML, CSS, JS)

## Project Structure

```
vito-interface/
├── client/                # React frontend (static app)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── models/        # TypeScript interfaces/types
│   │   ├── services/      # External API services
│   │   ├── utils/         # Utility functions
│   │   └── contracts/     # Smart contract ABIs
│   ├── public/            # Static assets
│   ├── build/             # Production build output
│   └── .env               # Environment variables
├── vito-contracts/        # Smart contracts
└── package.json          # Root package configuration
```

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn

### Environment Setup

Configure the environment variables:
- Copy `client/.env.example` to `client/.env.local`
- Set appropriate values for all environment variables (see STATIC_DEPLOYMENT_GUIDE.md for details)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hadv/vito-interface.git
cd vito-interface
```

2. Install dependencies:
```bash
# Use nvm to set the correct Node.js version (if available)
nvm use --lts

# Install dependencies
npm run install:all
```

### Running the Development Server

Run the client in development mode:

```bash
npm run dev
# or
npm start
```

The application will be available at `http://localhost:3000`

### Building for Production

To create a production build:

```bash
npm run build
```

This creates a `client/build/` directory with static files ready for deployment to any web server or hosting service.

## Web3Auth-Style Social Login Setup

The Vito interface supports Web3Auth-style social login using Google OAuth, allowing users to connect using their Google accounts with deterministic wallet generation.

### 1. Set up Web3Auth Dashboard (REQUIRED)

1. Visit the [Web3Auth Dashboard](https://dashboard.web3auth.io/)
2. Sign up or log in to your account
3. Create a new project
4. Copy your **Web3Auth Client ID** from the project dashboard
5. In your Web3Auth project, go to "Social Connections"
6. Configure Google OAuth:
   - Click on Google connection settings
   - You can either:
     - **Option A**: Use Web3Auth's default Google configuration (recommended)
     - **Option B**: Use your own Google OAuth Client ID (advanced)

### 2. Optional: Configure Custom Google OAuth (Advanced)

Only needed if you want to use your own Google OAuth configuration:

1. Go to the [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Identity Services API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. Set the application type to "Web application"
6. Add `https://auth.web3auth.io/auth` to "Authorized redirect URIs"
7. Copy your **Google Client ID**
8. Add it to your Web3Auth Dashboard under Social Connections

### 3. Update Environment Variables

Copy the `.env.example` file to `.env.local` in the client directory and update:

```bash
# Web3Auth Configuration (REQUIRED)
REACT_APP_WEB3AUTH_CLIENT_ID=your-web3auth-client-id-here

# Google OAuth Configuration (optional - for fallback methods only)
REACT_APP_GOOGLE_CLIENT_ID=your-google-oauth-client-id-here
```

### 4. Test the Integration

1. Start the development server
2. Click "Connect" in the header
3. Select "Google" from the wallet options
4. Complete the Google OAuth flow
5. Your Google account will be connected as a signer wallet

### Features

- **Social Login**: Users can connect using their Google accounts
- **Deterministic Wallets**: Same Google account always generates the same wallet address
- **Seamless Integration**: Works alongside existing MetaMask and WalletConnect options
- **No Complex Dependencies**: Uses Google Identity Services directly
- **User-Friendly**: No need to manage private keys manually
- **Web3Auth Compatible**: Ready for future Web3Auth SDK integration
- **Multi-Network Support**: Works across different blockchain networks

## License

This project is licensed under the MIT License - see the LICENSE file for details.