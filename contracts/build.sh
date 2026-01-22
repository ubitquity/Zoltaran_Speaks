#!/bin/bash
# Build script for Zoltaran Speaks smart contract
# Requires EOSIO CDT installed

set -e

echo "Building Zoltaran Speaks Smart Contract..."

# Direct compilation with eosio-cpp
eosio-cpp -abigen \
    -I. \
    -contract=zoltaranwish \
    -o zoltaranwish.wasm \
    zoltaranwish.cpp

echo ""
echo "Build complete!"
echo "Generated files:"
echo "  - zoltaranwish.wasm (contract bytecode)"
echo "  - zoltaranwish.abi  (contract ABI)"
echo ""
echo "Deploy to testnet:"
echo "  cleos -u https://proton-testnet.eosio.online set contract YOUR_ACCOUNT . zoltaranwish.wasm zoltaranwish.abi"
echo ""
echo "Initialize config:"
echo "  cleos push action YOUR_ACCOUNT setconfig '[\"admin.account\", \"tokencreate\", \"8,ARCADE\", 2000, 1000, 800, 200, 1000]' -p YOUR_ACCOUNT"
