/**
 * Zoltaran Speaks - JavaScript Classes
 * Extracted for testing purposes
 */

// ========== CONFIGURATION ==========
const CONFIG = {
    appName: 'Psychic Traveller',
    chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0',
    endpoints: ['https://proton.greymass.com', 'https://proton.eosusa.io'],
    contracts: {
        arcade: 'tokencreate',
        usdc: 'xtokens',
        zoltaran: 'zoltaranwish',
        receiver: 'zoltaranwish'
    },
    ipfs: {
        gateway: 'https://constellation.ubitquity.io/ipfs/',
        uploadUrl: 'https://constellation.ubitquity.io/api/v0/add'
    }
};

const CRYPTOBETS_CONFIG = {
    CONTRACT_ACCOUNT: 'zoltaranwish',
    TOKEN_CONTRACTS: {
        XUSDC: 'xtokens',
        ARCADE: 'tokencreate',
        NFTP: 'tokencreate'
    },
    TOKEN_PRECISION: {
        XUSDC: 6,
        ARCADE: 8,
        NFTP: 8
    },
    TOKEN_BONUSES: {
        ARCADE: 2.0,
        XUSDC: 3.5
    }
};

// ========== SPOOKY AUDIO ENGINE ==========
class SpookyAudioEngine {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.bgMusicPlaying = false;
        this.bgMusicGain = null;
        this.masterGain = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return true;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);
            this.initialized = true;
            return true;
        } catch (e) {
            return false;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        const audioToggle = typeof document !== 'undefined' ? document.getElementById('audioToggle') : null;
        if (audioToggle) {
            audioToggle.textContent = this.enabled ? '🔊' : '🔇';
        }
        if (!this.enabled && this.bgMusicGain) {
            this.bgMusicGain.gain.value = 0;
        } else if (this.enabled && this.bgMusicGain) {
            this.bgMusicGain.gain.value = 0.03;
        }
        return this.enabled;
    }

    playAmbientDrone() {
        // Disabled - sound effects still play on wins/losses
        return;
    }

    playLaugh() {
        if (!this.enabled || !this.audioContext) return false;
        return true;
    }

    playEvilLaugh() {
        if (!this.enabled || !this.audioContext) return false;
        return true;
    }

    playCrystalActivate() {
        if (!this.enabled || !this.audioContext) return false;
        return true;
    }

    playMagicReveal() {
        if (!this.enabled || !this.audioContext) return false;
        return true;
    }

    playSadSound() {
        if (!this.enabled || !this.audioContext) return false;
        return true;
    }

    playCoinSound() {
        if (!this.enabled || !this.audioContext) return false;
        return true;
    }
}

// ========== ROBOTIC VOICE ==========
class RoboticVoice {
    constructor() {
        this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
        this.enabled = true;
    }

    speak(text, pitch = 0.1, rate = 0.6) {
        if (!this.enabled || !this.synth) return false;
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = this.synth.getVoices();
        const deepVoice = voices.find(v =>
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('thomas') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('james') ||
            v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('guy')
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (deepVoice) utterance.voice = deepVoice;
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = 0.9;

        this.synth.speak(utterance);
        return true;
    }

    speakWishGranted() {
        return this.speak("Your wish... is granted!", 0.1, 0.55);
    }

    speakTokens(amount) {
        return this.speak(`Have some tokens instead... ${amount} arcade tokens are yours!`, 0.1, 0.6);
    }

    speakThinkAboutIt() {
        return this.speak("I will think about it... Come back tomorrow for a free spin!", 0.15, 0.55);
    }

    speakTryAgain() {
        return this.speak("The spirits are silent... Try again!", 0.1, 0.6);
    }

    speakWelcome() {
        return this.speak("Welcome, seeker of fortunes... Make your wish!", 0.1, 0.5);
    }

    speakMakingWish() {
        return this.speak("The spirits are listening...", 0.05, 0.5);
    }
}

// ========== CONSTELLATION IPFS ==========
class ConstellationIPFS {
    constructor(config = CONFIG) {
        this.gateway = config.ipfs.gateway;
        this.uploadUrl = config.ipfs.uploadUrl;
    }

    async addWish(wishText) {
        const wishData = {
            wish: wishText,
            timestamp: Date.now(),
            game: 'zoltaran_speaks',
            version: '2.0'
        };

        const formData = new FormData();
        const blob = new Blob([JSON.stringify(wishData)], { type: 'application/json' });
        formData.append('file', blob, 'wish.json');

        try {
            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('IPFS upload failed');
            }

            const result = await response.json();
            return result.Hash || result.cid;
        } catch (e) {
            // Fallback: create a deterministic CID-like hash from the content
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(wishData)));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return 'Qm' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 44);
        }
    }

    getGatewayUrl(cid) {
        return this.gateway + cid;
    }
}

// ========== COMMIT-REVEAL CLIENT ==========
class CommitRevealClient {
    constructor() {
        this.pendingReveal = null;
    }

    async generateSecret() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async generateCommitment(clientSecret, wishIpfsCid) {
        const preimage = clientSecret + wishIpfsCid;
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(preimage));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    storePendingReveal(commitId, clientSecret, wishIpfsCid) {
        this.pendingReveal = { commitId, clientSecret, wishIpfsCid };
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('zoltaran_pending_reveal', JSON.stringify(this.pendingReveal));
        }
    }

    getPendingReveal() {
        if (!this.pendingReveal && typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('zoltaran_pending_reveal');
            if (stored) {
                this.pendingReveal = JSON.parse(stored);
            }
        }
        return this.pendingReveal;
    }

    clearPendingReveal() {
        this.pendingReveal = null;
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('zoltaran_pending_reveal');
        }
    }
}

// ========== ZOLTARAN CONTRACT CLIENT ==========
class ZoltaranContract {
    constructor(config = CRYPTOBETS_CONFIG, endpoints = CONFIG.endpoints) {
        this.contractAccount = config.CONTRACT_ACCOUNT;
        this.rpcEndpoint = endpoints[0];
    }

    async commit(session, commitHash, wishType) {
        const hashBytes = [];
        for (let i = 0; i < commitHash.length; i += 2) {
            hashBytes.push(parseInt(commitHash.substring(i, i + 2), 16));
        }

        const result = await session.transact({
            actions: [{
                account: this.contractAccount,
                name: 'commit',
                authorization: [session.auth],
                data: {
                    player: session.auth.actor.toString(),
                    commit_hash: hashBytes,
                    wish_type: wishType
                }
            }]
        });

        return result;
    }

    async reveal(session, commitId, clientSecret, wishIpfsCid) {
        const result = await session.transact({
            actions: [{
                account: this.contractAccount,
                name: 'reveal',
                authorization: [session.auth],
                data: {
                    player: session.auth.actor.toString(),
                    commit_id: commitId,
                    client_secret: clientSecret,
                    wish_ipfs_cid: wishIpfsCid
                }
            }]
        });

        return result;
    }

    async getUserData(account) {
        try {
            const response = await fetch(`${this.rpcEndpoint}/v1/chain/get_table_rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    json: true,
                    code: this.contractAccount,
                    scope: this.contractAccount,
                    table: 'users',
                    lower_bound: account,
                    upper_bound: account,
                    limit: 1
                })
            });

            const data = await response.json();
            if (data.rows && data.rows.length > 0) {
                return data.rows[0];
            }
            return null;
        } catch (e) {
            console.error('Failed to get user data:', e);
            return null;
        }
    }

    async getLeaderboard(limit = 3) {
        try {
            const response = await fetch(`${this.rpcEndpoint}/v1/chain/get_table_rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    json: true,
                    code: this.contractAccount,
                    scope: this.contractAccount,
                    table: 'leaderboard',
                    index_position: 2,
                    key_type: 'i64',
                    limit: limit
                })
            });

            const data = await response.json();
            return data.rows || [];
        } catch (e) {
            console.error('Failed to get leaderboard:', e);
            return [];
        }
    }

    async getRecentHistory(limit = 10) {
        try {
            const response = await fetch(`${this.rpcEndpoint}/v1/chain/get_table_rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    json: true,
                    code: this.contractAccount,
                    scope: this.contractAccount,
                    table: 'gamehistory',
                    index_position: 3,
                    key_type: 'i64',
                    reverse: true,
                    limit: limit
                })
            });

            const data = await response.json();
            return data.rows || [];
        } catch (e) {
            console.error('Failed to get history:', e);
            return [];
        }
    }

    async getPendingCommit(account) {
        try {
            const response = await fetch(`${this.rpcEndpoint}/v1/chain/get_table_rows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    json: true,
                    code: this.contractAccount,
                    scope: this.contractAccount,
                    table: 'commits',
                    index_position: 2,
                    key_type: 'i64',
                    lower_bound: account,
                    upper_bound: account,
                    limit: 1
                })
            });

            const data = await response.json();
            if (data.rows && data.rows.length > 0) {
                return data.rows[0];
            }
            return null;
        } catch (e) {
            console.error('Failed to get pending commit:', e);
            return null;
        }
    }

    parseRevealResult(transactionResult) {
        const traces = transactionResult?.processed?.action_traces || [];

        let tokensWon = 0;
        let resultCode = 5; // Default to TRY_AGAIN

        for (const trace of traces) {
            if (trace.inline_traces) {
                for (const inlineTrace of trace.inline_traces) {
                    if (inlineTrace.act?.name === 'transfer' &&
                        inlineTrace.act?.account === CONFIG.contracts.arcade) {
                        const quantity = inlineTrace.act?.data?.quantity || '';
                        const match = quantity.match(/^([\d.]+)/);
                        if (match) {
                            tokensWon = parseFloat(match[1]);
                        }
                    }
                }
            }
        }

        if (tokensWon >= 1000) {
            resultCode = 3; // TOKENS_1000
        } else if (tokensWon >= 500) {
            resultCode = 2; // TOKENS_500
        } else if (tokensWon >= 250) {
            resultCode = 1; // TOKENS_250
        }

        return { resultCode, tokensWon };
    }
}

// ========== MEMO GENERATOR ==========
class MemoGenerator {
    constructor(key) {
        this.key = key || 'default_key';
        this.counter = Date.now();
    }

    async shortHash(data) {
        const encoder = new TextEncoder();
        const fullData = this.key + data + (this.counter++);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fullData));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    async purchaseMemo(user, packId, wishes) {
        const hash = await this.shortHash(`${user}:${packId}:${wishes}`);
        return `PW${hash}`;
    }

    async resultMemo(user, resultCode, amount) {
        const hash = await this.shortHash(`${user}:${resultCode}:${amount}`);
        return `${resultCode}${hash}`;
    }
}

// ========== OUTCOME CODES ==========
const OUTCOME_CODES = {
    0: { key: 'WISH_GRANTED', label: 'Your Wish Is Granted!', icon: '✨', type: 'win' },
    1: { key: 'TOKENS_250', label: 'Have Some Tokens!', icon: '🪙', type: 'tokens', amount: 250 },
    2: { key: 'TOKENS_500', label: 'A Fortune Awaits!', icon: '💰', type: 'tokens', amount: 500 },
    3: { key: 'TOKENS_1000', label: 'Grand Prophecy!', icon: '🏆', type: 'tokens', amount: 1000 },
    4: { key: 'FREE_SPIN', label: 'I Will Think About It...', icon: '🎰', type: 'spin' },
    5: { key: 'TRY_AGAIN', label: 'Try Again...', icon: '🔄', type: 'lose' }
};

// ========== UTILITY FUNCTIONS ==========
function formatTokenAmount(amount, precision) {
    return (amount / Math.pow(10, precision)).toFixed(precision);
}

function parseTokenAmount(amountStr, precision) {
    const num = parseFloat(amountStr);
    return Math.round(num * Math.pow(10, precision));
}

function isValidProtonAccount(name) {
    return /^[a-z1-5.]{1,12}$/.test(name);
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim()
        .slice(0, 500);
}

function getCurrentDayNumber() {
    return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
}

// ========== EXPORTS ==========
module.exports = {
    CONFIG,
    CRYPTOBETS_CONFIG,
    OUTCOME_CODES,
    SpookyAudioEngine,
    RoboticVoice,
    ConstellationIPFS,
    CommitRevealClient,
    ZoltaranContract,
    MemoGenerator,
    formatTokenAmount,
    parseTokenAmount,
    isValidProtonAccount,
    sanitizeInput,
    getCurrentDayNumber
};
