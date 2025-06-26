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



## License

This project is licensed under the MIT License - see the LICENSE file for details.