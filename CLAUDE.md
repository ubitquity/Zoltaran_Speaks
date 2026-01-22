# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zoltaran Speaks (also called "Psychic Traveller Wish") is a **fully decentralized** arcade-style browser game where users make wishes to a fortune teller character. The game runs entirely on the Proton/XPR Network blockchain with IPFS storage for wish text.

**Live version**: https://ndao.org/arcade/games/Zoltarano_Speaks/
**License**: MIT

## Architecture

```
Browser (index.html)
    |
    +---> Proton Blockchain (zoltaranwish contract)
    |     +-- users table (balances, stats)
    |     +-- commits table (pending wishes)
    |     +-- gamehistory table (results)
    |     +-- leaderboard table (top players)
    |     +-- $ARCADE treasury (instant payouts)
    |
    +---> IPFS (Ubitquity Constellation)
          +-- Wish text storage (JSON files)
```

### Frontend (`index.html`)

Single-page HTML application with embedded CSS and JavaScript:
- **Proton Web SDK** integration for wallet connections and transactions
- **Commit-Reveal RNG** for provably fair on-chain outcomes
- **IPFS Client** (ConstellationIPFS class) for decentralized wish storage
- **Smart Contract Client** (ZoltaranContract class) for blockchain interactions
- **Web Speech API** for robotic voice synthesis (deep baritone Zoltarano voice)
- **Web Audio API** for synthesized sound effects (SpookyAudioEngine class)
- Multiple cryptocurrency token support for purchases (XUSDC, ARCADE, NFTP, TITLET, etc.)

### Smart Contract (`contracts/zoltaranwish.cpp`)

EOSIO/Proton smart contract written in C++:

**Tables:**
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Balances & stats | account, purchased_wishes, last_free_day, total_wins, tokens_won |
| `commits` | Pending wishes | id, player, commit_hash, block_num, wish_type |
| `gamehistory` | Results log | id, player, result_code, tokens_won, wish_ipfs_cid, timestamp |
| `leaderboard` | Top players | player, wins, tokens_won |
| `config` | Settings | probabilities, treasury_balance, paused flag |
| `tokenprices` | Accepted tokens | symbol, contract, price_per_wish, bonus_bps |

**Actions:**
- `commit(player, commit_hash, wish_type)` - Store commitment, deduct wish
- `reveal(player, commit_id, client_secret, wish_ipfs_cid)` - Verify hash, generate outcome, instant payout
- `on_transfer()` - Handle token purchases (notification handler)
- `setconfig()` - Admin configuration
- `settoken()` - Add/update accepted tokens
- `cleanup()` - Remove expired commits

### IPFS Integration

Using **Ubitquity Constellation** (standard IPFS API):
- Upload endpoint: `https://constellation.ubitquity.io/api/v0/add`
- Gateway: `https://constellation.ubitquity.io/ipfs/{CID}`

Wish format stored on IPFS:
```json
{
    "wish": "I wish for...",
    "timestamp": 1706000000000,
    "game": "zoltaran_speaks",
    "version": "2.0"
}
```

## Game Mechanics

### Commit-Reveal RNG Flow
1. Client generates `secret` (32 random bytes) + uploads wish to IPFS
2. Client sends `commit(SHA256(secret + ipfs_cid))`
3. Client waits 3 seconds for block finality
4. Client sends `reveal(secret, ipfs_cid)`
5. Contract calculates: `outcome = SHA256(secret + tapos_block_prefix + player) % 10000`
6. Outcome determined, instant payout if tokens won

### Outcome Probabilities (50% house edge)
| Range | Probability | Outcome |
|-------|-------------|---------|
| 0-1999 | 20% | Wish Granted |
| 2000-2999 | 10% | 250 $ARCADE tokens |
| 3000-3799 | 8% | 500 $ARCADE tokens |
| 3800-3999 | 2% | 1000 $ARCADE tokens |
| 4000-4999 | 10% | Free Spin (wish added) |
| 5000-9999 | 50% | Try Again (loss) |

### Credit System
- 1 free wish per day per user (tracked on-chain by day number)
- Purchased wishes stored on-chain in `users` table
- Token transfer to contract with memo `WISHES:{count}` adds wishes
- Multiple token types accepted with bonus percentages (ARCADE +2%, XUSDC +3.5%)

### Instant Payouts
Token rewards are paid instantly on-chain during the `reveal` action - no queue or manual claiming needed!

## Development

### Smart Contract Building
Requires EOSIO CDT (Contract Development Toolkit):
```bash
cd contracts
./build.sh
# Or directly:
eosio-cpp -abigen -o zoltaranwish.wasm zoltaranwish.cpp
```

### Smart Contract Deployment (Testnet)
```bash
# Deploy
cleos -u https://proton-testnet.eosio.online set contract YOUR_ACCOUNT ./contracts zoltaranwish.wasm zoltaranwish.abi

# Initialize config
cleos push action YOUR_ACCOUNT setconfig '["admin.account", "tokencreate", "8,ARCADE", 2000, 1000, 800, 200, 1000]' -p YOUR_ACCOUNT

# Add accepted token
cleos push action YOUR_ACCOUNT settoken '["6,XUSDC", "xtokens", 100000, 350, true]' -p YOUR_ACCOUNT

# Fund treasury
cleos push action tokencreate transfer '["admin.account", "YOUR_ACCOUNT", "100000.00000000 ARCADE", "TREASURY"]' -p admin.account
```

### Local Testing (Frontend Only)
For frontend development, any static file server works:
```bash
python -m http.server 8000
# or
npx serve .
```
Then open http://localhost:8000 in a browser.

**Note:** Full game testing requires a deployed contract on testnet or mainnet.

### Key Configuration Constants
In `index.html` JavaScript:
- `CONFIG` - Proton blockchain endpoints, contract names, IPFS config
- `CRYPTOBETS_CONFIG` - Token contracts, precision values, contract account
- `OUTCOMES` / `OUTCOME_CODES` - Game probability distribution and result codes

### Key JavaScript Classes
- `ConstellationIPFS` - IPFS upload and gateway URL generation
- `CommitRevealClient` - Secret generation, hash computation, reveal storage
- `ZoltaranContract` - Contract interactions (commit, reveal, table queries)
- `SpookyAudioEngine` - Synthesized sound effects
- `RoboticVoice` - Text-to-speech for Zoltarano

### External Dependencies
- Proton Web SDK (CDN): `https://cdnjs.cloudflare.com/ajax/libs/proton-web-sdk/4.2.20/bundle.min.js`
- Google Fonts: Cinzel Decorative, Inter
- Zoltarano image: `https://ndao.org/arcade/games/Zoltarano_Speaks/ZOLTARANO.png`
- IPFS Gateway: `https://constellation.ubitquity.io/ipfs/`

## Security Considerations

1. **Front-running prevention**: `tapos_block_prefix` unknown until reveal tx submitted
2. **Commit expiration**: 1 hour timeout, forfeited wishes refunded for purchased type
3. **One pending commit per user**: Prevents spam
4. **Treasury protection**: Only contract can execute inline payouts
5. **Free wish tracking**: Day number stored on-chain prevents timezone exploits

## Files

| File | Purpose |
|------|---------|
| `index.html` | Complete frontend application (HTML/CSS/JS) |
| `contracts/zoltaranwish.cpp` | Smart contract source code |
| `contracts/CMakeLists.txt` | CMake build configuration |
| `contracts/build.sh` | Build script for contract |
| `CLAUDE.md` | This documentation file |

## Deleted Files (Centralized Components)

The following files from the original centralized version are no longer used:
- `credits.php` - Replaced by on-chain `users` table
- `psychic_queue.php` - Replaced by on-chain tables and actions
- `log.txt` - Replaced by on-chain `gamehistory` table
- `payout_queue.txt` - Replaced by instant on-chain payouts
- `private/` directory - No longer needed, all data is on-chain
