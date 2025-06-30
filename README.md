# Vito Safe{Wallet}

A secure and efficient application designed to interact with Safe{Wallet} through a minimalist interface.

## Features

- Command-based interface (:command)
- Safe Wallet management
- Transaction viewing and execution

## Tech Stack

- **Frontend**: React, TypeScript, Styled Components
- **Backend**: Node.js, Express, TypeScript
- **Styling**: CSS-in-JS with styled-components

## Project Structure

```
vito-interface/
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── models/        # TypeScript interfaces/types
│   │   ├── pages/         # Page components
│   │   ├── styles/        # Global styles
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   └── .env               # Frontend environment variables
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   └── index.ts       # Server entry point
│   └── .env               # Backend environment variables
└── package.json          # Root package configuration
```

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn

### Environment Setup

1. Configure the client environment:
   - Copy `.env.example` to `.env` in the client directory
   - Set appropriate values for all environment variables

2. Configure the server environment:
   - Create or edit `.env` file in the server directory
   - Set required API keys and configuration values

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hadv/vito-interface.git
cd vito-interface
```

2. Install dependencies:
```bash
# Use nvm to set the correct Node.js version
nvm use --lts

# Install all dependencies
npm run install:all
```

### Running the Development Server

Run both the client and server in development mode:

```bash
npm run dev
```

You can also run them separately:

```bash
# Run just the client
npm run start:client

# Run just the server
npm run start:server
```

### Building for Production

To create production builds for both client and server:

```bash
npm run build
```

## Web3Auth-Style Social Login Setup

The Vito interface supports Web3Auth-style social login using Google OAuth, allowing users to connect using their Google accounts with deterministic wallet generation.

### 1. Configure Google OAuth

1. Go to the [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Identity Services API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. Set the application type to "Web application"
6. Add your domain to "Authorized JavaScript origins":
   - For development: `http://localhost:3000`
   - For production: `https://yourdomain.com`
7. Copy your **Google Client ID**

### 2. Optional: Set up Web3Auth Dashboard (for future Web3Auth integration)

1. Visit the [Web3Auth Dashboard](https://dashboard.web3auth.io/)
2. Sign up or log in to your account
3. Create a new project
4. Copy your **Client ID** from the project dashboard
5. Configure Google OAuth in the dashboard using your Google Client ID

### 3. Update Environment Variables

Copy the `.env.example` file to `.env.local` in the client directory and update:

```bash
# Web3Auth Configuration (optional for future integration)
REACT_APP_WEB3AUTH_CLIENT_ID=your-web3auth-client-id-here

# Google OAuth Configuration (required)
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