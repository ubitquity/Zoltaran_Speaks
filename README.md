<p align="center">
  <img src="https://ndao.org/arcade/games/Zoltarano_Speaks/ZOLTARANO.png" alt="Zoltaran Speaks" width="200"/>
</p>

<h1 align="center">Zoltaran Speaks</h1>

<p align="center">
  <strong>A Fully Decentralized Fortune Teller Game on Proton Blockchain</strong>
</p>

<p align="center">
  <a href="https://github.com/ubitquity/Zoltaran_Speaks/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"/>
  </a>
  <a href="https://protonchain.com/">
    <img src="https://img.shields.io/badge/blockchain-Proton%2FXPR-7B3FE4" alt="Proton/XPR Network"/>
  </a>
  <a href="https://ipfs.io/">
    <img src="https://img.shields.io/badge/storage-IPFS-65C2CB" alt="IPFS"/>
  </a>
  <img src="https://img.shields.io/badge/version-2.0-green" alt="Version 2.0"/>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-smart-contract">Smart Contract</a> •
  <a href="#-development">Development</a> •
  <a href="#-security">Security</a>
</p>

---

## 🎰 About

**Zoltaran Speaks** is an arcade-style fortune teller game where players make wishes and receive mystical outcomes. Unlike traditional web games, Zoltaran runs **100% on-chain** with provably fair random number generation and instant token payouts.

> *"Make a wish... if you dare!"* 🔮

### Live Demo
🎮 **Play Now**: [ndao.org/arcade/games/Zoltarano_Speaks](https://ndao.org/arcade/games/Zoltarano_Speaks/)

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔗 Fully Decentralized
- No backend servers required
- All game state stored on Proton blockchain
- Wish text stored on IPFS
- Verifiable on block explorer

</td>
<td width="50%">

### 🎲 Provably Fair
- Commit-reveal RNG scheme
- Outcome determined on-chain
- Impossible to manipulate or predict
- Full transparency

</td>
</tr>
<tr>
<td width="50%">

### ⚡ Instant Payouts
- Token rewards paid immediately
- No withdrawal delays
- No payout queues
- Direct to your wallet

</td>
<td width="50%">

### 🪙 Multi-Token Support
- XUSDC, ARCADE, NFTP
- TITLET, UBQTX, UBQT
- NDAO, NDAOX, and more
- Bonus wishes on select tokens

</td>
</tr>
</table>

---

## 🎯 How It Works

### Game Flow

```mermaid
sequenceDiagram
    participant Player
    participant Frontend
    participant IPFS
    participant Contract
    participant Treasury

    Player->>Frontend: Enter wish & click "Make Wish"
    Frontend->>IPFS: Upload wish text
    IPFS-->>Frontend: Return CID
    Frontend->>Frontend: Generate secret
    Frontend->>Contract: commit(hash)
    Note over Frontend: Wait 3 seconds
    Frontend->>Contract: reveal(secret, CID)
    Contract->>Contract: Calculate outcome
    alt Token Win
        Contract->>Treasury: Transfer tokens
        Treasury->>Player: Instant payout!
    end
    Contract-->>Frontend: Result
    Frontend->>Player: Show outcome
```

### Outcome Probabilities

| Outcome | Probability | Reward |
|---------|-------------|--------|
| ✨ **Wish Granted** | 20% | Your wish comes true! |
| 🥉 Small Blessing | 10% | 250 $ARCADE |
| 🥈 Medium Fortune | 8% | 500 $ARCADE |
| 🥇 Grand Prophecy | 2% | 1,000 $ARCADE |
| 🎰 Free Spin | 10% | +1 Free Wish |
| 🔄 Try Again | 50% | Better luck next time |

> **House Edge**: 50% — Entertainment purposes only!

---

## 🚀 Quick Start

### Prerequisites

- [WebAuth Wallet](https://webauth.com/) or compatible Proton wallet
- Some tokens for wishes (XUSDC, ARCADE, etc.)
- Modern web browser

### Playing the Game

1. **Connect Wallet** — Click "Connect Wallet" and approve with WebAuth
2. **Get Wishes** — Use your daily free wish or purchase a pack
3. **Make a Wish** — Type your wish and click the mystical button
4. **See Your Fate** — Watch Zoltaran reveal your destiny!

### Token Bonuses

| Token | Bonus |
|-------|-------|
| 💵 XUSDC | +3.5% extra wishes |
| 🕹️ ARCADE | +2% extra wishes |

---

## 📜 Smart Contract

The game runs on a custom EOSIO smart contract deployed on Proton/XPR Network.

### Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    zoltaranwish Contract                     │
├─────────────────────────────────────────────────────────────┤
│  Tables                                                      │
│  ├── users        → Balances, stats, free wish tracking     │
│  ├── commits      → Pending commit-reveal wishes            │
│  ├── gamehistory  → All completed game results              │
│  ├── leaderboard  → Top players by wins                     │
│  ├── config       → Game settings & probabilities           │
│  └── tokenprices  → Accepted tokens & bonuses               │
├─────────────────────────────────────────────────────────────┤
│  Actions                                                     │
│  ├── commit       → Submit wish commitment                  │
│  ├── reveal       → Reveal and determine outcome            │
│  ├── on_transfer  → Handle token purchases                  │
│  ├── setconfig    → Admin: Update settings                  │
│  ├── settoken     → Admin: Configure tokens                 │
│  └── cleanup      → Remove expired commits                  │
└─────────────────────────────────────────────────────────────┘
```

### Contract Address

| Network | Account |
|---------|---------|
| Mainnet | `zoltaranwish` |
| Testnet | `zoltartest` |

---

## 🛠️ Development

### Project Structure

```text
Zoltaran_Speaks/
├── index.html              # Complete frontend (HTML/CSS/JS)
├── contracts/
│   ├── zoltaranwish.cpp    # Smart contract source
│   ├── CMakeLists.txt      # CMake build config
│   └── build.sh            # Build script
├── CLAUDE.md               # Development documentation
└── README.md               # This file
```

### Building the Smart Contract

**Requirements**: [EOSIO CDT](https://github.com/EOSIO/eosio.cdt) v1.8+

```bash
# Clone the repository
git clone https://github.com/ubitquity/Zoltaran_Speaks.git
cd Zoltaran_Speaks/contracts

# Build
./build.sh

# Output: zoltaranwish.wasm, zoltaranwish.abi
```

### Deploying to Testnet

```bash
# Deploy contract
cleos -u https://proton-testnet.eosio.online \
  set contract YOUR_ACCOUNT . zoltaranwish.wasm zoltaranwish.abi

# Initialize configuration
cleos push action YOUR_ACCOUNT setconfig \
  '["admin", "tokencreate", "8,ARCADE", 2000, 1000, 800, 200, 1000]' \
  -p YOUR_ACCOUNT

# Add accepted token (XUSDC example)
cleos push action YOUR_ACCOUNT settoken \
  '["6,XUSDC", "xtokens", 100000, 350, true]' \
  -p YOUR_ACCOUNT

# Fund the treasury
cleos push action tokencreate transfer \
  '["admin", "YOUR_ACCOUNT", "100000.00000000 ARCADE", "TREASURY"]' \
  -p admin
```

### Running Frontend Locally

```bash
# Any static file server works
python -m http.server 8000
# or
npx serve .

# Open http://localhost:8000
```

> **Note**: Full gameplay requires a deployed contract on testnet/mainnet.

---

## 🔒 Security

### Provably Fair RNG

The commit-reveal scheme ensures fair, unpredictable outcomes:

1. **Commit Phase**: Player submits `SHA256(secret + ipfs_cid)` — secret is unknown to contract
2. **Block Finality**: Wait for block confirmation
3. **Reveal Phase**: Player reveals secret, contract computes:
   ```text
   outcome = SHA256(secret + tapos_block_prefix + player) % 10000
   ```
4. **Verification**: `tapos_block_prefix` is unknowable at commit time, preventing manipulation

### Additional Protections

| Protection | Description |
|------------|-------------|
| 🚫 Front-running | `tapos_block_prefix` unknown until reveal |
| ⏱️ Commit Expiry | 1 hour timeout, purchased wishes refunded |
| 👤 Single Commit | One pending commit per user |
| 🔐 Treasury | Only contract can execute payouts |
| 📅 Free Wish | Day-based tracking prevents exploits |

---

## 🌐 IPFS Integration

Wish text is stored on decentralized IPFS via [Ubitquity Constellation](https://ubitquityx.com/IPFS_Constellation/docs/):

```json
{
  "wish": "I wish for world peace",
  "timestamp": 1706000000000,
  "game": "zoltaran_speaks",
  "version": "2.0"
}
```

**Gateway**: `https://constellation.ubitquity.io/ipfs/{CID}`

---

## 🎨 Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/Proton-7B3FE4?style=for-the-badge&logo=proton&logoColor=white" alt="Proton"/>
  <img src="https://img.shields.io/badge/EOSIO-000000?style=for-the-badge&logo=eos&logoColor=white" alt="EOSIO"/>
  <img src="https://img.shields.io/badge/IPFS-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white" alt="IPFS"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=cplusplus&logoColor=white" alt="C++"/>
  <img src="https://img.shields.io/badge/Web3-F16822?style=for-the-badge&logo=web3.js&logoColor=white" alt="Web3"/>
</p>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```text
MIT License

Copyright (c) 2025-2026 UBITQUITY, INC.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

---

## 🙏 Acknowledgments

- [nDAO](https://ndao.org) — Airdrop Arcade platform
- [Proton](https://protonchain.com) — Blockchain infrastructure
- [Ubitquity](https://ubitquity.io) — IPFS Constellation hosting
- [WebAuth](https://webauth.com) — Wallet integration

---

## 🔗 Links

<p align="center">
  <a href="https://ndao.org/arcade/games/Zoltarano_Speaks/">
    <img src="https://img.shields.io/badge/🎮_Play_Now-ndao.org-purple?style=for-the-badge" alt="Play Now"/>
  </a>
  <a href="https://ndao.org/arcade">
    <img src="https://img.shields.io/badge/🕹️_More_Games-Airdrop_Arcade-green?style=for-the-badge" alt="Airdrop Arcade"/>
  </a>
  <a href="https://protonscan.io/account/zoltaranwish">
    <img src="https://img.shields.io/badge/🔍_Contract-Protonscan-blue?style=for-the-badge" alt="View on Protonscan"/>
  </a>
</p>

---

<p align="center">
  <sub>Built with 🔮 by the nDAO community</sub>
</p>
