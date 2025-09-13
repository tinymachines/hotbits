#!/bin/bash

# Start the Hotbits Web Application
# This script sets up the environment and starts the webapp

# Change to the webapp directory
cd /home/tinmac/hotbits/webapp

# Source NVM to make Node.js available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Start the webapp in development mode
npm run dev