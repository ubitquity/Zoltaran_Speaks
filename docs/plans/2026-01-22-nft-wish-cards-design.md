# NFT Wish Cards - Design Document

## Overview

Transform winning wishes into collectible AtomicAssets NFTs that players can mint, trade, and display on ProtonMarket.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| NFT Platform | AtomicAssets | Industry standard, ProtonMarket ready, wallet support |
| Minting Trigger | Player-initiated | Player controls when to mint, no unwanted NFTs |
| Minting Fee | Free | Reward for winning, encourages engagement |
| Artwork | Hash-based generative | Every NFT unique, deterministic, no external deps |
| Eligible Outcomes | All wins | Wish Granted, token wins, Free Spin |
| Mint Window | Until next win | Simple, one pending mint max |

## Rarity Tiers

| Outcome | Rarity | Color Theme | Probability |
|---------|--------|-------------|-------------|
| 1000 tokens | Legendary | Gold/Purple | 2% |
| 500 tokens | Epic | Purple/Blue | 8% |
| 250 tokens | Rare | Blue/Cyan | 10% |
| Wish Granted | Uncommon | Green/Teal | 20% |
| Free Spin | Common | Silver/Gray | 10% |

## Data Flow

```
Player wins → Result screen shows "Mint NFT" button →
Player clicks → Frontend generates art → Uploads to IPFS →
Calls contract mintnft action → Contract calls AtomicAssets →
NFT appears in player's wallet / ProtonMarket
```

## Smart Contract Changes

### Modified `users` Table

Add one field to track mintable result:

```cpp
TABLE user {
    name            account;
    uint32_t        purchased_wishes;
    uint32_t        last_free_day;
    uint32_t        total_wishes;
    uint32_t        total_wins;
    uint64_t        tokens_won;
    uint64_t        last_mintable_result;  // NEW: game result ID (0 = none)

    uint64_t primary_key() const { return account.value; }
};
```

### Modified `reveal` Action

After recording game result, set mintable result for winning outcomes:

```cpp
// If winning outcome, set mintable result
if (result_code != OUTCOME_TRY_AGAIN) {
    users.modify(user_itr, same_payer, [&](auto& u) {
        u.last_mintable_result = result_id;
    });
}
```

### New `mintnft` Action

```cpp
ACTION mintnft(name player, string image_ipfs_cid) {
    require_auth(player);

    // 1. Get user record, verify last_mintable_result != 0
    users_table users(get_self(), get_self().value);
    auto user_itr = users.find(player.value);
    check(user_itr != users.end(), "User not found");
    check(user_itr->last_mintable_result != 0, "No mintable result");

    // 2. Fetch game result from gamehistory
    gamehistory_table history(get_self(), get_self().value);
    auto result_itr = history.find(user_itr->last_mintable_result);
    check(result_itr != history.end(), "Game result not found");
    check(result_itr->player == player, "Not your result");

    // 3. Determine rarity from result_code
    string rarity = get_rarity_string(result_itr->result_code);
    string outcome = get_outcome_string(result_itr->result_code);

    // 4. Build metadata
    vector<pair<string, string>> immutable_data = {
        {"name", "Zoltaran Wish #" + to_string(result_itr->id)},
        {"img", "ipfs://" + image_ipfs_cid},
        {"rarity", rarity},
        {"wish_cid", result_itr->wish_ipfs_cid},
        {"game_id", to_string(result_itr->id)},
        {"outcome", outcome},
        {"minted_at", to_string(current_time_point().sec_since_epoch())}
    };

    // 5. Call atomicassets::mintasset
    action(
        permission_level{get_self(), "active"_n},
        "atomicassets"_n,
        "mintasset"_n,
        make_tuple(
            get_self(),           // authorized_minter
            "zoltaranwish"_n,     // collection_name
            "wishcard"_n,         // schema_name
            player,               // new_asset_owner
            immutable_data,       // immutable attributes
            vector<pair<string,string>>{}, // mutable (empty)
            vector<asset>{}       // tokens_to_back (none)
        )
    ).send();

    // 6. Clear mintable result
    users.modify(user_itr, same_payer, [&](auto& u) {
        u.last_mintable_result = 0;
    });
}
```

## AtomicAssets Setup

One-time admin setup before launch:

### Create Collection

```bash
cleos push action atomicassets createcol '{
  "author": "zoltaranwish",
  "collection_name": "zoltaranwish",
  "allow_notify": true,
  "authorized_accounts": ["zoltaranwish"],
  "notify_accounts": [],
  "market_fee": 0.05,
  "data": [
    {"key": "name", "value": ["string", "Zoltaran Wish Cards"]},
    {"key": "img", "value": ["string", "QmCollectionImage"]},
    {"key": "description", "value": ["string", "Collectible wishes from Zoltaran Speaks"]}
  ]
}' -p zoltaranwish
```

### Create Schema

```bash
cleos push action atomicassets createschema '{
  "authorized_creator": "zoltaranwish",
  "collection_name": "zoltaranwish",
  "schema_name": "wishcard",
  "schema_format": [
    {"name": "name", "type": "string"},
    {"name": "img", "type": "string"},
    {"name": "rarity", "type": "string"},
    {"name": "wish_cid", "type": "string"},
    {"name": "game_id", "type": "uint64"},
    {"name": "outcome", "type": "string"},
    {"name": "minted_at", "type": "uint64"}
  ]
}' -p zoltaranwish
```

## Frontend Changes

### New `NFTMinter` Class

```javascript
class NFTMinter {
    constructor(ipfsClient, contract) {
        this.ipfs = ipfsClient;
        this.contract = contract;
    }

    // Generate deterministic art from wish hash
    generateArt(wishText, rarity, resultId) {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');

        // Seed from wish text hash
        const seed = this.hashToSeed(wishText + resultId);

        // Draw layers:
        // 1. Background gradient (rarity colors)
        // 2. Crystal ball with swirling particles
        // 3. Central glow effect
        // 4. Rarity badge
        // 5. Wish text (truncated)

        return canvas;
    }

    // Upload art + metadata to IPFS
    async uploadToIPFS(canvas, metadata) {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const imageCID = await this.ipfs.addFile(blob);
        return imageCID;
    }

    // Call contract mintnft action
    async mint(imageCID) {
        return await this.contract.mintNFT(imageCID);
    }

    hashToSeed(str) {
        // Convert string to deterministic numeric seed
    }
}
```

### UI Changes

Result overlay modifications:
- Winning outcomes show "Mint as NFT" button
- Button states: Ready → Minting... → Minted!
- Link to view NFT in wallet after success

### Rarity Color Themes

```javascript
const RARITY_COLORS = {
    legendary: { primary: '#FFD700', secondary: '#8B008B' },  // Gold/Purple
    epic:      { primary: '#8B008B', secondary: '#0000FF' },  // Purple/Blue
    rare:      { primary: '#0000FF', secondary: '#00FFFF' },  // Blue/Cyan
    uncommon:  { primary: '#008000', secondary: '#008080' },  // Green/Teal
    common:    { primary: '#C0C0C0', secondary: '#808080' }   // Silver/Gray
};
```

## Implementation Checklist

### Smart Contract
- [ ] Add `last_mintable_result` field to `users` table
- [ ] Update `reveal` action to set mintable result on wins
- [ ] Add `mintnft` action with AtomicAssets integration
- [ ] Add helper functions for rarity/outcome strings

### Frontend
- [ ] Create `NFTMinter` class with generative art algorithm
- [ ] Add "Mint as NFT" button to result overlay
- [ ] Handle minting flow (generate → upload → transact)
- [ ] Add `mintNFT` method to `ZoltaranContract` class

### Deployment
- [ ] Create AtomicAssets collection
- [ ] Create AtomicAssets schema
- [ ] Deploy updated contract
- [ ] Test full mint flow on testnet

## Files to Modify

| File | Changes |
|------|---------|
| `contracts/zoltaranwish.cpp` | Add `last_mintable_result`, `mintnft` action |
| `src/classes.js` | Add `NFTMinter` class |
| `index.html` | Add mint button UI and handlers |
| `__tests__/NFTMinter.test.js` | New test file |

## Security Considerations

1. **Authorization**: Only the winning player can mint their own result
2. **One mint per win**: `last_mintable_result` cleared after minting
3. **Result verification**: Contract verifies game result exists and belongs to player
4. **No double-mint**: Once minted, cannot mint same result again
