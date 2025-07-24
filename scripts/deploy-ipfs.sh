#!/bin/bash

# Vito Interface - IPFS Deployment Script
# This script automates the deployment process to IPFS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="vito-interface"
BUILD_DIR="client/build"
DEPLOYMENT_LOG="deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js LTS version."
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm."
    fi
    
    # Check if we're in the right directory
    if [ ! -f "client/package.json" ]; then
        error "Please run this script from the project root directory."
    fi
    
    success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Use LTS Node.js version if nvm is available
    if command -v nvm &> /dev/null; then
        log "Using nvm to set Node.js LTS version..."
        nvm use --lts || warning "Could not set Node.js LTS version with nvm"
    fi
    
    # Check for production environment file
    if [ ! -f "client/.env.production.local" ]; then
        warning "Production environment file not found. Creating from template..."
        if [ -f "client/.env.example" ]; then
            cp client/.env.example client/.env.production.local
            warning "Please edit client/.env.production.local with your production values before continuing."
            read -p "Press Enter to continue after editing the environment file..."
        else
            error "No environment template found. Please create client/.env.production.local"
        fi
    fi
    
    success "Environment setup complete"
}

# Build the application
build_application() {
    log "Building application for production..."
    
    cd client
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci || error "Failed to install dependencies"
    
    # Run build
    log "Creating production build..."
    npm run build || error "Build failed"
    
    # Check build output
    if [ ! -d "build" ]; then
        error "Build directory not created"
    fi
    
    # Get build size
    BUILD_SIZE=$(du -sh build | cut -f1)
    log "Build completed. Size: $BUILD_SIZE"
    
    cd ..
    success "Application build complete"
}

# Test build locally
test_build() {
    log "Testing build locally..."
    
    if command -v npx &> /dev/null; then
        log "Starting local test server on port 3001..."
        cd client
        npx serve -s build -p 3001 &
        SERVER_PID=$!
        cd ..
        
        sleep 3
        
        if curl -s http://localhost:3001 > /dev/null; then
            success "Local test server is running at http://localhost:3001"
            log "Please test the application in your browser before proceeding."
            read -p "Press Enter to continue after testing (this will stop the test server)..."
            kill $SERVER_PID 2>/dev/null || true
        else
            warning "Could not verify local test server"
        fi
    else
        warning "npx not available. Please test the build manually."
    fi
}

# Deploy to IPFS via Pinata
deploy_pinata() {
    log "Deploying to IPFS via Pinata..."
    
    if ! command -v pinata &> /dev/null; then
        log "Installing Pinata CLI..."
        npm install -g @pinata/cli || error "Failed to install Pinata CLI"
    fi
    
    # Check if authenticated
    if ! pinata auth --test &> /dev/null; then
        warning "Pinata authentication required."
        log "Please run 'pinata auth' to authenticate with your Pinata account."
        read -p "Press Enter after authentication..."
    fi
    
    # Upload to IPFS
    VERSION=$(date +"%Y%m%d-%H%M%S")
    UPLOAD_NAME="${PROJECT_NAME}-${VERSION}"
    
    log "Uploading to IPFS with name: $UPLOAD_NAME"
    
    cd client
    IPFS_RESULT=$(pinata upload build/ --name "$UPLOAD_NAME" --json)
    cd ..
    
    if [ $? -eq 0 ]; then
        IPFS_HASH=$(echo "$IPFS_RESULT" | jq -r '.IpfsHash' 2>/dev/null || echo "$IPFS_RESULT" | grep -o 'Qm[a-zA-Z0-9]*')
        
        if [ -n "$IPFS_HASH" ]; then
            success "Successfully uploaded to IPFS!"
            log "IPFS Hash: $IPFS_HASH"
            log "IPFS URL: https://ipfs.io/ipfs/$IPFS_HASH"
            log "Pinata Gateway: https://gateway.pinata.cloud/ipfs/$IPFS_HASH"
            
            # Save deployment info
            echo "Deployment Date: $(date)" > deployment-info.txt
            echo "IPFS Hash: $IPFS_HASH" >> deployment-info.txt
            echo "Upload Name: $UPLOAD_NAME" >> deployment-info.txt
            echo "IPFS URL: https://ipfs.io/ipfs/$IPFS_HASH" >> deployment-info.txt
            echo "Pinata Gateway: https://gateway.pinata.cloud/ipfs/$IPFS_HASH" >> deployment-info.txt
            
            success "Deployment information saved to deployment-info.txt"
            return 0
        else
            error "Could not extract IPFS hash from upload result"
        fi
    else
        error "Failed to upload to IPFS via Pinata"
    fi
}

# Deploy to IPFS via Fleek
deploy_fleek() {
    log "Deploying to IPFS via Fleek..."
    
    if ! command -v fleek &> /dev/null; then
        log "Installing Fleek CLI..."
        npm install -g @fleek-platform/cli || error "Failed to install Fleek CLI"
    fi
    
    # Check if authenticated
    if ! fleek whoami &> /dev/null; then
        warning "Fleek authentication required."
        log "Please run 'fleek login' to authenticate with your Fleek account."
        read -p "Press Enter after authentication..."
    fi
    
    # Check if project is initialized
    if [ ! -f "fleek.config.js" ]; then
        warning "Fleek project not initialized."
        log "Please run 'fleek sites init' to initialize the project."
        read -p "Press Enter after initialization..."
    fi
    
    # Deploy
    log "Deploying to Fleek..."
    fleek sites deploy || error "Failed to deploy to Fleek"
    
    success "Successfully deployed to Fleek!"
}

# Main deployment function
main() {
    log "Starting IPFS deployment process for $PROJECT_NAME"
    
    # Create deployment log
    echo "=== Vito Interface IPFS Deployment Log ===" > "$DEPLOYMENT_LOG"
    echo "Started: $(date)" >> "$DEPLOYMENT_LOG"
    
    check_prerequisites
    setup_environment
    build_application
    test_build
    
    # Choose deployment method
    echo ""
    log "Choose deployment method:"
    echo "1) Pinata (Recommended for beginners)"
    echo "2) Fleek (Recommended for developers)"
    echo "3) Skip IPFS deployment (build only)"
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            deploy_pinata
            ;;
        2)
            deploy_fleek
            ;;
        3)
            log "Skipping IPFS deployment"
            ;;
        *)
            error "Invalid choice"
            ;;
    esac
    
    success "Deployment process completed!"
    
    if [ -f "deployment-info.txt" ]; then
        log "Next steps:"
        log "1. Test your deployment using the IPFS URLs in deployment-info.txt"
        log "2. If everything works, update your ENS domain content hash"
        log "3. Test ENS resolution: your-domain.eth"
        log ""
        log "ENS Content Hash Format: ipfs://<your-ipfs-hash>"
        log "See IPFS_ENS_DEPLOYMENT_GUIDE.md for detailed ENS configuration steps"
    fi
    
    echo "Completed: $(date)" >> "$DEPLOYMENT_LOG"
}

# Run main function
main "$@"
