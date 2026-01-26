# Zoltaran Speaks Smart Contract Build Configuration
# Requires EOSIO CDT (Contract Development Toolkit)
#
# Build instructions:
#   mkdir build && cd build
#   cmake ..
#   make
#
# Or using eosio-cpp directly:
#   eosio-cpp -abigen -o zoltaranwish.wasm zoltaranwish.cpp
#

cmake_minimum_required(VERSION 3.5)

project(zoltaranwish VERSION 1.0.0)

# Find eosio.cdt package
find_package(eosio.cdt REQUIRED)

# Compile the contract
add_contract(zoltaranwish zoltaranwish
    ${CMAKE_CURRENT_SOURCE_DIR}/zoltaranwish.cpp
)

# Note: Ricardian contracts not included in this version
# To add legal clauses, create a ricardian/ directory and uncomment:
# target_ricardian_directory(zoltaranwish ${CMAKE_CURRENT_SOURCE_DIR}/ricardian)
