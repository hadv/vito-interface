# Vito Interface

A secure and efficient application designed to interact with Safe{Wallet} through a minimalist Vito interface.

## Features

- Vito-style keyboard navigation (j, k, h, l)
- Command-based interface (:command)
- Visual and normal mode operations
- Safe Wallet management
- Transaction viewing and execution
- Modern, dark-mode UI inspired by coding editors

## Tech Stack

- **Frontend**: React, TypeScript, Styled Components
- **Backend**: Node.js, Express, TypeScript
- **Styling**: CSS-in-JS with styled-components

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vito-interface.git
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

## Usage

### Keyboard Navigation

- `j`: Move down
- `k`: Move up
- `h`: Move left
- `l`: Move right
- `i`: Enter insert mode
- `v`: Enter visual mode
- `Esc`: Return to normal mode
- `:`: Enter command mode

### Commands

- `:accounts` or `:accs`: View wallet accounts
- `:transactions` or `:txs`: View transactions
- `:send [from] [to] [amount]`: Create a new transaction
- `:help`: Show help information

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by [Vito](https://github.com/hadv/vito)
- Uses Vito-style navigation concepts 