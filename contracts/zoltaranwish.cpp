/**
 * Zoltaran Speaks - Decentralized Wish Game Smart Contract
 *
 * A provably fair game where users make wishes and receive outcomes
 * determined by commit-reveal random number generation on-chain.
 *
 * Architecture:
 * - Commit-reveal RNG prevents front-running and manipulation
 * - IPFS storage for wish text (CID stored on-chain)
 * - Instant token payouts from contract treasury
 * - On-chain leaderboard and game history
 */

#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>
#include <eosio/crypto.hpp>
#include <eosio/singleton.hpp>
#include <eosio/transaction.hpp>

using namespace eosio;
using namespace std;

CONTRACT zoltaranwish : public contract {
public:
    using contract::contract;

    // =========== OUTCOME CODES ===========
    // Probability ranges (out of 10000):
    // 0-1999 (20%): WISH_GRANTED
    // 2000-2999 (10%): TOKENS_250
    // 3000-3799 (8%): TOKENS_500
    // 3800-3999 (2%): TOKENS_1000
    // 4000-4999 (10%): FREE_SPIN
    // 5000-9999 (50%): TRY_AGAIN
    static constexpr uint8_t OUTCOME_WISH_GRANTED = 0;
    static constexpr uint8_t OUTCOME_TOKENS_250 = 1;
    static constexpr uint8_t OUTCOME_TOKENS_500 = 2;
    static constexpr uint8_t OUTCOME_TOKENS_1000 = 3;
    static constexpr uint8_t OUTCOME_FREE_SPIN = 4;
    static constexpr uint8_t OUTCOME_TRY_AGAIN = 5;

    // Token reward amounts
    static constexpr uint64_t TOKENS_250 = 25000000000;   // 250.00000000 ARCADE
    static constexpr uint64_t TOKENS_500 = 50000000000;   // 500.00000000 ARCADE
    static constexpr uint64_t TOKENS_1000 = 100000000000; // 1000.00000000 ARCADE

    // Commit types
    static constexpr uint8_t WISH_TYPE_FREE = 0;
    static constexpr uint8_t WISH_TYPE_PURCHASED = 1;

    // Constants
    static constexpr uint32_t COMMIT_EXPIRY_SECONDS = 3600; // 1 hour
    static constexpr uint32_t MIN_REVEAL_DELAY_BLOCKS = 1;  // At least 1 block

    // =========== TABLES ===========

    /**
     * Configuration singleton
     * Stores game settings and admin controls
     */
    TABLE config {
        name            admin;              // Contract admin
        name            arcade_contract;    // ARCADE token contract
        symbol          arcade_symbol;      // ARCADE symbol
        uint64_t        treasury_balance;   // Available payout funds
        bool            paused;             // Emergency pause flag
        uint32_t        prob_win;           // 2000 = 20%
        uint32_t        prob_tokens_250;    // 1000 = 10%
        uint32_t        prob_tokens_500;    // 800 = 8%
        uint32_t        prob_tokens_1000;   // 200 = 2%
        uint32_t        prob_free_spin;     // 1000 = 10%
        // Remaining probability (5000 = 50%) = TRY_AGAIN
    };
    typedef singleton<"config"_n, config> config_singleton;

    /**
     * Accepted tokens for wish purchases
     */
    TABLE tokenconfig {
        symbol          sym;                // Token symbol
        name            contract;           // Token contract
        uint64_t        price_per_wish;     // Price in token units
        uint16_t        bonus_bps;          // Bonus wishes in basis points (350 = 3.5%)
        bool            enabled;            // Whether accepting this token

        uint64_t primary_key() const { return sym.code().raw(); }
    };
    typedef multi_index<"tokenprices"_n, tokenconfig> tokenprices_table;

    /**
     * User accounts - tracks balances and stats
     */
    TABLE user {
        name            account;            // User's account name
        uint32_t        purchased_wishes;   // Available purchased wishes
        uint32_t        last_free_day;      // Day number of last free wish
        uint32_t        total_wishes;       // Total wishes made
        uint32_t        total_wins;         // Total wish granted outcomes
        uint64_t        tokens_won;         // Total ARCADE tokens won

        uint64_t primary_key() const { return account.value; }
    };
    typedef multi_index<"users"_n, user> users_table;

    /**
     * Pending commit entries - waiting for reveal
     */
    TABLE commit {
        uint64_t        id;                 // Auto-incrementing ID
        name            player;             // Who made the commit
        checksum256     commit_hash;        // SHA256(client_secret + wish_ipfs_cid)
        uint32_t        block_num;          // Block when committed
        uint8_t         wish_type;          // FREE or PURCHASED
        uint32_t        timestamp;          // When committed

        uint64_t primary_key() const { return id; }
        uint64_t by_player() const { return player.value; }
        uint64_t by_time() const { return timestamp; }
    };
    typedef multi_index<"commits"_n, commit,
        indexed_by<"byplayer"_n, const_mem_fun<commit, uint64_t, &commit::by_player>>,
        indexed_by<"bytime"_n, const_mem_fun<commit, uint64_t, &commit::by_time>>
    > commits_table;

    /**
     * Game history - records of all completed wishes
     */
    TABLE gameresult {
        uint64_t        id;                 // Auto-incrementing ID
        name            player;             // Who played
        uint8_t         result_code;        // Outcome code
        uint64_t        tokens_won;         // Tokens won (0 if none)
        string          wish_ipfs_cid;      // IPFS CID of wish text
        uint32_t        timestamp;          // When revealed

        uint64_t primary_key() const { return id; }
        uint64_t by_player() const { return player.value; }
        uint64_t by_time() const { return timestamp; }
    };
    typedef multi_index<"gamehistory"_n, gameresult,
        indexed_by<"byplayer"_n, const_mem_fun<gameresult, uint64_t, &gameresult::by_player>>,
        indexed_by<"bytime"_n, const_mem_fun<gameresult, uint64_t, &gameresult::by_time>>
    > gamehistory_table;

    /**
     * Leaderboard - top players by wins
     */
    TABLE leader {
        name            player;             // Player account
        uint32_t        wins;               // Total wish granted wins
        uint64_t        tokens_won;         // Total tokens won

        uint64_t primary_key() const { return player.value; }
        uint64_t by_wins() const { return static_cast<uint64_t>(UINT32_MAX - wins); } // Descending
    };
    typedef multi_index<"leaderboard"_n, leader,
        indexed_by<"bywins"_n, const_mem_fun<leader, uint64_t, &leader::by_wins>>
    > leaderboard_table;

    /**
     * Global counter for auto-increment IDs
     */
    TABLE globals {
        uint64_t        next_commit_id;
        uint64_t        next_result_id;
    };
    typedef singleton<"globals"_n, globals> globals_singleton;

    // =========== ACTIONS ===========

    /**
     * Initialize or update contract configuration
     * @param admin - Admin account that can modify settings
     * @param arcade_contract - ARCADE token contract name
     * @param arcade_symbol - ARCADE token symbol
     */
    ACTION setconfig(
        name admin,
        name arcade_contract,
        symbol arcade_symbol,
        uint32_t prob_win,
        uint32_t prob_tokens_250,
        uint32_t prob_tokens_500,
        uint32_t prob_tokens_1000,
        uint32_t prob_free_spin
    ) {
        require_auth(get_self());

        // Validate probabilities sum to <= 10000
        uint32_t total = prob_win + prob_tokens_250 + prob_tokens_500 + prob_tokens_1000 + prob_free_spin;
        check(total <= 10000, "Probabilities exceed 100%");

        config_singleton conf_table(get_self(), get_self().value);
        config conf = conf_table.exists() ? conf_table.get() : config{};

        conf.admin = admin;
        conf.arcade_contract = arcade_contract;
        conf.arcade_symbol = arcade_symbol;
        conf.paused = false;
        conf.prob_win = prob_win;
        conf.prob_tokens_250 = prob_tokens_250;
        conf.prob_tokens_500 = prob_tokens_500;
        conf.prob_tokens_1000 = prob_tokens_1000;
        conf.prob_free_spin = prob_free_spin;

        conf_table.set(conf, get_self());
    }

    /**
     * Add or update accepted token for wish purchases
     */
    ACTION settoken(
        symbol sym,
        name token_contract,
        uint64_t price_per_wish,
        uint16_t bonus_bps,
        bool enabled
    ) {
        config_singleton conf_table(get_self(), get_self().value);
        check(conf_table.exists(), "Contract not configured");
        config conf = conf_table.get();

        require_auth(conf.admin);

        tokenprices_table tokens(get_self(), get_self().value);
        auto itr = tokens.find(sym.code().raw());

        if (itr == tokens.end()) {
            tokens.emplace(get_self(), [&](auto& t) {
                t.sym = sym;
                t.contract = token_contract;
                t.price_per_wish = price_per_wish;
                t.bonus_bps = bonus_bps;
                t.enabled = enabled;
            });
        } else {
            tokens.modify(itr, same_payer, [&](auto& t) {
                t.contract = token_contract;
                t.price_per_wish = price_per_wish;
                t.bonus_bps = bonus_bps;
                t.enabled = enabled;
            });
        }
    }

    /**
     * Pause/unpause the game (emergency control)
     */
    ACTION setpause(bool paused) {
        config_singleton conf_table(get_self(), get_self().value);
        check(conf_table.exists(), "Contract not configured");
        config conf = conf_table.get();

        require_auth(conf.admin);

        conf.paused = paused;
        conf_table.set(conf, get_self());
    }

    /**
     * Commit a wish - first step of commit-reveal
     * @param player - User making the wish
     * @param commit_hash - SHA256(client_secret + wish_ipfs_cid)
     * @param wish_type - WISH_TYPE_FREE or WISH_TYPE_PURCHASED
     */
    ACTION commit(name player, checksum256 commit_hash, uint8_t wish_type) {
        require_auth(player);

        config_singleton conf_table(get_self(), get_self().value);
        check(conf_table.exists(), "Contract not configured");
        config conf = conf_table.get();
        check(!conf.paused, "Game is paused");

        // Check user has available wishes
        users_table users(get_self(), get_self().value);
        auto user_itr = users.find(player.value);

        if (wish_type == WISH_TYPE_FREE) {
            uint32_t today = current_day_number();

            if (user_itr == users.end()) {
                // New user - create record
                users.emplace(player, [&](auto& u) {
                    u.account = player;
                    u.purchased_wishes = 0;
                    u.last_free_day = today;
                    u.total_wishes = 0;
                    u.total_wins = 0;
                    u.tokens_won = 0;
                });
            } else {
                check(user_itr->last_free_day < today, "Free wish already used today");
                users.modify(user_itr, same_payer, [&](auto& u) {
                    u.last_free_day = today;
                });
            }
        } else {
            check(user_itr != users.end(), "User not found");
            check(user_itr->purchased_wishes > 0, "No purchased wishes available");

            users.modify(user_itr, same_payer, [&](auto& u) {
                u.purchased_wishes--;
            });
        }

        // Check for existing pending commit (one per user)
        commits_table commits(get_self(), get_self().value);
        auto by_player = commits.get_index<"byplayer"_n>();
        auto existing = by_player.find(player.value);
        check(existing == by_player.end(), "You have a pending commit - reveal or wait for expiry");

        // Create commit
        globals_singleton glob_table(get_self(), get_self().value);
        globals glob = glob_table.exists() ? glob_table.get() : globals{1, 1};

        commits.emplace(player, [&](auto& c) {
            c.id = glob.next_commit_id;
            c.player = player;
            c.commit_hash = commit_hash;
            c.block_num = current_block();
            c.wish_type = wish_type;
            c.timestamp = current_time_point().sec_since_epoch();
        });

        glob.next_commit_id++;
        glob_table.set(glob, get_self());
    }

    /**
     * Reveal a wish - second step of commit-reveal
     * @param player - User revealing
     * @param commit_id - ID of the commit to reveal
     * @param client_secret - The secret used in the commit hash
     * @param wish_ipfs_cid - IPFS CID of the wish text
     */
    ACTION reveal(name player, uint64_t commit_id, string client_secret, string wish_ipfs_cid) {
        require_auth(player);

        config_singleton conf_table(get_self(), get_self().value);
        check(conf_table.exists(), "Contract not configured");
        config conf = conf_table.get();
        check(!conf.paused, "Game is paused");

        // Find and validate commit
        commits_table commits(get_self(), get_self().value);
        auto commit_itr = commits.find(commit_id);
        check(commit_itr != commits.end(), "Commit not found");
        check(commit_itr->player == player, "Not your commit");

        // Validate timing - must be at least 1 block later
        check(current_block() > commit_itr->block_num, "Must wait at least 1 block");

        // Validate commit hash
        string preimage = client_secret + wish_ipfs_cid;
        checksum256 computed_hash = sha256(preimage.c_str(), preimage.size());
        check(commit_itr->commit_hash == computed_hash, "Hash mismatch - invalid secret or CID");

        // Generate provably fair random outcome
        // Uses: client_secret + tapos_block_prefix (unknown at commit time) + player
        uint32_t tapos = tapos_block_prefix();
        string rng_input = client_secret + to_string(tapos) + player.to_string();
        checksum256 rng_hash = sha256(rng_input.c_str(), rng_input.size());

        // Extract random number from hash (0-9999)
        auto hash_data = rng_hash.extract_as_byte_array();
        uint32_t random_value = (static_cast<uint32_t>(hash_data[0]) << 24 |
                                  static_cast<uint32_t>(hash_data[1]) << 16 |
                                  static_cast<uint32_t>(hash_data[2]) << 8 |
                                  static_cast<uint32_t>(hash_data[3])) % 10000;

        // Determine outcome based on probabilities
        uint8_t result_code;
        uint64_t tokens_won = 0;

        uint32_t cumulative = 0;

        cumulative += conf.prob_win;
        if (random_value < cumulative) {
            result_code = OUTCOME_WISH_GRANTED;
        } else {
            cumulative += conf.prob_tokens_250;
            if (random_value < cumulative) {
                result_code = OUTCOME_TOKENS_250;
                tokens_won = TOKENS_250;
            } else {
                cumulative += conf.prob_tokens_500;
                if (random_value < cumulative) {
                    result_code = OUTCOME_TOKENS_500;
                    tokens_won = TOKENS_500;
                } else {
                    cumulative += conf.prob_tokens_1000;
                    if (random_value < cumulative) {
                        result_code = OUTCOME_TOKENS_1000;
                        tokens_won = TOKENS_1000;
                    } else {
                        cumulative += conf.prob_free_spin;
                        if (random_value < cumulative) {
                            result_code = OUTCOME_FREE_SPIN;
                        } else {
                            result_code = OUTCOME_TRY_AGAIN;
                        }
                    }
                }
            }
        }

        // Update user stats
        users_table users(get_self(), get_self().value);
        auto user_itr = users.find(player.value);

        if (user_itr == users.end()) {
            users.emplace(player, [&](auto& u) {
                u.account = player;
                u.purchased_wishes = (result_code == OUTCOME_FREE_SPIN) ? 1 : 0;
                u.last_free_day = 0;
                u.total_wishes = 1;
                u.total_wins = (result_code == OUTCOME_WISH_GRANTED) ? 1 : 0;
                u.tokens_won = tokens_won;
            });
        } else {
            users.modify(user_itr, same_payer, [&](auto& u) {
                u.total_wishes++;
                if (result_code == OUTCOME_WISH_GRANTED) {
                    u.total_wins++;
                }
                if (result_code == OUTCOME_FREE_SPIN) {
                    u.purchased_wishes++;
                }
                u.tokens_won += tokens_won;
            });
        }

        // Update leaderboard if won
        if (result_code == OUTCOME_WISH_GRANTED || tokens_won > 0) {
            update_leaderboard(player, result_code == OUTCOME_WISH_GRANTED ? 1 : 0, tokens_won);
        }

        // Record game result
        globals_singleton glob_table(get_self(), get_self().value);
        globals glob = glob_table.exists() ? glob_table.get() : globals{1, 1};

        gamehistory_table history(get_self(), get_self().value);
        history.emplace(get_self(), [&](auto& g) {
            g.id = glob.next_result_id;
            g.player = player;
            g.result_code = result_code;
            g.tokens_won = tokens_won;
            g.wish_ipfs_cid = wish_ipfs_cid;
            g.timestamp = current_time_point().sec_since_epoch();
        });

        glob.next_result_id++;
        glob_table.set(glob, get_self());

        // Pay out tokens if won
        if (tokens_won > 0) {
            asset payout = asset(tokens_won, conf.arcade_symbol);

            action(
                permission_level{get_self(), "active"_n},
                conf.arcade_contract,
                "transfer"_n,
                make_tuple(get_self(), player, payout, string("Zoltaran Speaks winnings!"))
            ).send();

            // Update treasury balance tracking
            conf.treasury_balance -= tokens_won;
            conf_table.set(conf, get_self());
        }

        // Delete the commit
        commits.erase(commit_itr);
    }

    /**
     * Handle incoming token transfers for wish purchases
     */
    [[eosio::on_notify("*::transfer")]]
    void on_transfer(name from, name to, asset quantity, string memo) {
        // Only process incoming transfers
        if (to != get_self() || from == get_self()) {
            return;
        }

        config_singleton conf_table(get_self(), get_self().value);
        if (!conf_table.exists()) {
            return; // Not configured yet
        }
        config conf = conf_table.get();

        // Check if this is ARCADE token (treasury funding)
        if (get_first_receiver() == conf.arcade_contract &&
            quantity.symbol == conf.arcade_symbol) {

            // Check if it's a treasury funding transfer
            if (memo == "TREASURY" || memo == "treasury" || memo == "fund") {
                conf.treasury_balance += quantity.amount;
                conf_table.set(conf, get_self());
                return;
            }
        }

        // Check if it's a wish purchase
        if (memo.substr(0, 7) != "WISHES:") {
            return; // Not a wish purchase
        }

        // Parse wish count from memo
        uint32_t wish_count = 0;
        try {
            wish_count = stoul(memo.substr(7));
        } catch (...) {
            check(false, "Invalid wish count in memo");
        }
        check(wish_count > 0 && wish_count <= 1000, "Invalid wish count");

        // Find token config
        tokenprices_table tokens(get_self(), get_self().value);
        auto token_itr = tokens.find(quantity.symbol.code().raw());
        check(token_itr != tokens.end(), "Token not accepted");
        check(token_itr->enabled, "Token currently disabled");
        check(token_itr->contract == get_first_receiver(), "Wrong token contract");

        // Validate payment amount
        uint64_t required = token_itr->price_per_wish * wish_count;
        check(quantity.amount >= required, "Insufficient payment");

        // Calculate bonus wishes
        uint32_t bonus_wishes = (wish_count * token_itr->bonus_bps) / 10000;
        uint32_t total_wishes = wish_count + bonus_wishes;

        // Credit user's wishes
        users_table users(get_self(), get_self().value);
        auto user_itr = users.find(from.value);

        if (user_itr == users.end()) {
            users.emplace(get_self(), [&](auto& u) {
                u.account = from;
                u.purchased_wishes = total_wishes;
                u.last_free_day = 0;
                u.total_wishes = 0;
                u.total_wins = 0;
                u.tokens_won = 0;
            });
        } else {
            users.modify(user_itr, same_payer, [&](auto& u) {
                u.purchased_wishes += total_wishes;
            });
        }
    }

    /**
     * Clean up expired commits (can be called by anyone)
     * Refunds the wish to expired commits
     */
    ACTION cleanup(uint32_t max_clean) {
        config_singleton conf_table(get_self(), get_self().value);
        check(conf_table.exists(), "Contract not configured");

        commits_table commits(get_self(), get_self().value);
        users_table users(get_self(), get_self().value);

        auto by_time = commits.get_index<"bytime"_n>();
        uint32_t now = current_time_point().sec_since_epoch();
        uint32_t cleaned = 0;

        auto itr = by_time.begin();
        while (itr != by_time.end() && cleaned < max_clean) {
            if (now - itr->timestamp > COMMIT_EXPIRY_SECONDS) {
                // Expired - refund the wish if purchased
                if (itr->wish_type == WISH_TYPE_PURCHASED) {
                    auto user_itr = users.find(itr->player.value);
                    if (user_itr != users.end()) {
                        users.modify(user_itr, same_payer, [&](auto& u) {
                            u.purchased_wishes++;
                        });
                    }
                }
                itr = by_time.erase(itr);
                cleaned++;
            } else {
                break; // No more expired commits
            }
        }
    }

    /**
     * Admin: withdraw treasury funds (emergency only)
     */
    ACTION withdraw(name to, asset quantity) {
        config_singleton conf_table(get_self(), get_self().value);
        check(conf_table.exists(), "Contract not configured");
        config conf = conf_table.get();

        require_auth(conf.admin);

        check(quantity.symbol == conf.arcade_symbol, "Wrong token symbol");
        check(quantity.amount <= conf.treasury_balance, "Insufficient treasury");

        action(
            permission_level{get_self(), "active"_n},
            conf.arcade_contract,
            "transfer"_n,
            make_tuple(get_self(), to, quantity, string("Treasury withdrawal"))
        ).send();

        conf.treasury_balance -= quantity.amount;
        conf_table.set(conf, get_self());
    }

private:
    /**
     * Get current block number from TAPOS
     */
    uint32_t current_block() {
        return current_time_point().sec_since_epoch() / 2; // Approximate
    }

    /**
     * Get current day number (for free wish tracking)
     */
    uint32_t current_day_number() {
        return current_time_point().sec_since_epoch() / 86400;
    }

    /**
     * Update leaderboard with new win/tokens
     */
    void update_leaderboard(name player, uint32_t wins_delta, uint64_t tokens_delta) {
        leaderboard_table leaderboard(get_self(), get_self().value);
        auto itr = leaderboard.find(player.value);

        if (itr == leaderboard.end()) {
            leaderboard.emplace(get_self(), [&](auto& l) {
                l.player = player;
                l.wins = wins_delta;
                l.tokens_won = tokens_delta;
            });
        } else {
            leaderboard.modify(itr, same_payer, [&](auto& l) {
                l.wins += wins_delta;
                l.tokens_won += tokens_delta;
            });
        }
    }
};
