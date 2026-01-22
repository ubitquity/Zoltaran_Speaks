/**
 * Tests for NFTMinter class
 * NFT generation and minting for Zoltaran wishes
 */

const { NFTMinter, RARITY_COLORS, RESULT_TO_RARITY, OUTCOME_CODES, ConstellationIPFS, ZoltaranContract } = require('../src/classes');

describe('NFTMinter', () => {
    let nftMinter;
    let mockIpfsClient;
    let mockContract;

    beforeEach(() => {
        mockIpfsClient = {
            gateway: 'https://constellation.ubitquity.io/ipfs/',
            uploadUrl: 'https://constellation.ubitquity.io/api/v0/add'
        };
        mockContract = {
            contractAccount: 'zoltaranwish'
        };
        nftMinter = new NFTMinter(mockIpfsClient, mockContract);
    });

    describe('constructor', () => {
        it('should initialize with ipfs client and contract', () => {
            expect(nftMinter.ipfs).toBe(mockIpfsClient);
            expect(nftMinter.contract).toBe(mockContract);
        });
    });

    describe('RARITY_COLORS', () => {
        it('should have all rarity levels defined', () => {
            expect(RARITY_COLORS.Legendary).toBeDefined();
            expect(RARITY_COLORS.Epic).toBeDefined();
            expect(RARITY_COLORS.Rare).toBeDefined();
            expect(RARITY_COLORS.Uncommon).toBeDefined();
            expect(RARITY_COLORS.Common).toBeDefined();
        });

        it('should have primary, secondary, and glow colors for each rarity', () => {
            Object.values(RARITY_COLORS).forEach(colors => {
                expect(colors.primary).toBeDefined();
                expect(colors.secondary).toBeDefined();
                expect(colors.glow).toBeDefined();
            });
        });

        it('should have Legendary as gold/purple', () => {
            expect(RARITY_COLORS.Legendary.primary).toBe('#FFD700');
            expect(RARITY_COLORS.Legendary.secondary).toBe('#8B008B');
        });
    });

    describe('RESULT_TO_RARITY', () => {
        it('should map result code 3 to Legendary', () => {
            expect(RESULT_TO_RARITY[3]).toBe('Legendary');
        });

        it('should map result code 2 to Epic', () => {
            expect(RESULT_TO_RARITY[2]).toBe('Epic');
        });

        it('should map result code 1 to Rare', () => {
            expect(RESULT_TO_RARITY[1]).toBe('Rare');
        });

        it('should map result code 0 to Uncommon', () => {
            expect(RESULT_TO_RARITY[0]).toBe('Uncommon');
        });

        it('should map result code 4 to Common', () => {
            expect(RESULT_TO_RARITY[4]).toBe('Common');
        });
    });

    describe('hashToSeed', () => {
        it('should generate a numeric seed from string', () => {
            const seed = nftMinter.hashToSeed('test string');
            expect(typeof seed).toBe('number');
            expect(seed).toBeGreaterThanOrEqual(0);
        });

        it('should generate consistent seed for same input', () => {
            const seed1 = nftMinter.hashToSeed('same input');
            const seed2 = nftMinter.hashToSeed('same input');
            expect(seed1).toBe(seed2);
        });

        it('should generate different seeds for different inputs', () => {
            const seed1 = nftMinter.hashToSeed('input 1');
            const seed2 = nftMinter.hashToSeed('input 2');
            expect(seed1).not.toBe(seed2);
        });

        it('should handle empty string', () => {
            const seed = nftMinter.hashToSeed('');
            expect(typeof seed).toBe('number');
        });

        it('should handle special characters', () => {
            const seed = nftMinter.hashToSeed('test with emoji 🔮✨');
            expect(typeof seed).toBe('number');
        });
    });

    describe('seededRandom', () => {
        it('should return value between 0 and 1', () => {
            const value = nftMinter.seededRandom(12345);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        });

        it('should return consistent value for same seed', () => {
            const val1 = nftMinter.seededRandom(99999);
            const val2 = nftMinter.seededRandom(99999);
            expect(val1).toBe(val2);
        });

        it('should return different values for different seeds', () => {
            const val1 = nftMinter.seededRandom(100);
            const val2 = nftMinter.seededRandom(200);
            expect(val1).not.toBe(val2);
        });
    });

    describe('getRarity', () => {
        it('should return Legendary for result code 3', () => {
            expect(nftMinter.getRarity(3)).toBe('Legendary');
        });

        it('should return Epic for result code 2', () => {
            expect(nftMinter.getRarity(2)).toBe('Epic');
        });

        it('should return Rare for result code 1', () => {
            expect(nftMinter.getRarity(1)).toBe('Rare');
        });

        it('should return Uncommon for result code 0', () => {
            expect(nftMinter.getRarity(0)).toBe('Uncommon');
        });

        it('should return Common for result code 4', () => {
            expect(nftMinter.getRarity(4)).toBe('Common');
        });

        it('should return Common for unknown result code', () => {
            expect(nftMinter.getRarity(99)).toBe('Common');
        });

        it('should return Common for TRY_AGAIN (5)', () => {
            expect(nftMinter.getRarity(5)).toBe('Common');
        });
    });

    describe('isEligibleForMint', () => {
        it('should return true for WISH_GRANTED (0)', () => {
            expect(nftMinter.isEligibleForMint(0)).toBe(true);
        });

        it('should return true for TOKENS_250 (1)', () => {
            expect(nftMinter.isEligibleForMint(1)).toBe(true);
        });

        it('should return true for TOKENS_500 (2)', () => {
            expect(nftMinter.isEligibleForMint(2)).toBe(true);
        });

        it('should return true for TOKENS_1000 (3)', () => {
            expect(nftMinter.isEligibleForMint(3)).toBe(true);
        });

        it('should return true for FREE_SPIN (4)', () => {
            expect(nftMinter.isEligibleForMint(4)).toBe(true);
        });

        it('should return false for TRY_AGAIN (5)', () => {
            expect(nftMinter.isEligibleForMint(5)).toBe(false);
        });
    });

    describe('getResultCodeFromRarity', () => {
        it('should return 3 for Legendary', () => {
            expect(nftMinter.getResultCodeFromRarity('Legendary')).toBe(3);
        });

        it('should return 2 for Epic', () => {
            expect(nftMinter.getResultCodeFromRarity('Epic')).toBe(2);
        });

        it('should return 1 for Rare', () => {
            expect(nftMinter.getResultCodeFromRarity('Rare')).toBe(1);
        });

        it('should return 0 for Uncommon', () => {
            expect(nftMinter.getResultCodeFromRarity('Uncommon')).toBe(0);
        });

        it('should return 4 for Common', () => {
            expect(nftMinter.getResultCodeFromRarity('Common')).toBe(4);
        });

        it('should return 5 for unknown rarity', () => {
            expect(nftMinter.getResultCodeFromRarity('Unknown')).toBe(5);
        });
    });

    describe('generateArt', () => {
        it('should return a canvas object', () => {
            const canvas = nftMinter.generateArt('test wish', 'Legendary', 123);
            expect(canvas).toBeDefined();
            expect(canvas.width).toBe(800);
            expect(canvas.height).toBe(1000);
        });

        it('should generate deterministic art for same inputs', () => {
            const canvas1 = nftMinter.generateArt('my wish', 'Epic', 456);
            const canvas2 = nftMinter.generateArt('my wish', 'Epic', 456);
            // Both should have the same dimensions
            expect(canvas1.width).toBe(canvas2.width);
            expect(canvas1.height).toBe(canvas2.height);
        });

        it('should handle all rarity types', () => {
            const rarities = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
            rarities.forEach(rarity => {
                const canvas = nftMinter.generateArt('test', rarity, 1);
                expect(canvas).toBeDefined();
            });
        });

        it('should handle long wish text', () => {
            const longWish = 'This is a very long wish that exceeds fifty characters and should be truncated in the display';
            const canvas = nftMinter.generateArt(longWish, 'Rare', 789);
            expect(canvas).toBeDefined();
        });

        it('should handle empty wish text', () => {
            const canvas = nftMinter.generateArt('', 'Common', 0);
            expect(canvas).toBeDefined();
        });

        it('should return mock canvas with getContext in test environment', () => {
            const canvas = nftMinter.generateArt('test', 'Epic', 1);
            const ctx = canvas.getContext('2d');
            expect(ctx).toBeDefined();
            expect(typeof ctx.fillRect).toBe('function');
            expect(typeof ctx.createLinearGradient).toBe('function');
        });

        it('should return mock canvas with toBlob in test environment', (done) => {
            const canvas = nftMinter.generateArt('test', 'Rare', 2);
            expect(canvas.toBlob).toBeDefined();
            canvas.toBlob((blob) => {
                expect(blob).toBeDefined();
                expect(blob.type).toBe('image/png');
                done();
            });
        });
    });

    describe('createMockContext', () => {
        it('should return a mock context with required methods', () => {
            const ctx = nftMinter.createMockContext();
            expect(typeof ctx.fillRect).toBe('function');
            expect(typeof ctx.fillText).toBe('function');
            expect(typeof ctx.beginPath).toBe('function');
            expect(typeof ctx.arc).toBe('function');
            expect(typeof ctx.fill).toBe('function');
            expect(typeof ctx.stroke).toBe('function');
            expect(typeof ctx.ellipse).toBe('function');
            expect(typeof ctx.createLinearGradient).toBe('function');
            expect(typeof ctx.createRadialGradient).toBe('function');
        });

        it('should return gradients with addColorStop method', () => {
            const ctx = nftMinter.createMockContext();
            const linearGrad = ctx.createLinearGradient();
            const radialGrad = ctx.createRadialGradient();
            expect(typeof linearGrad.addColorStop).toBe('function');
            expect(typeof radialGrad.addColorStop).toBe('function');
        });
    });

    describe('uploadToIPFS', () => {
        it('should return a CID string', async () => {
            const metadata = { name: 'Test NFT', rarity: 'Epic' };
            const cid = await nftMinter.uploadToIPFS({}, metadata);
            expect(typeof cid).toBe('string');
            expect(cid.startsWith('Qm')).toBe(true);
        });

        it('should generate consistent CID for same metadata', async () => {
            const metadata = { name: 'Test', value: 123 };
            const cid1 = await nftMinter.uploadToIPFS({}, metadata);
            const cid2 = await nftMinter.uploadToIPFS({}, metadata);
            expect(cid1).toBe(cid2);
        });

        it('should generate different CID for different metadata', async () => {
            const metadata1 = { name: 'Test 1' };
            const metadata2 = { name: 'Test 2' };
            const cid1 = await nftMinter.uploadToIPFS({}, metadata1);
            const cid2 = await nftMinter.uploadToIPFS({}, metadata2);
            expect(cid1).not.toBe(cid2);
        });
    });

    describe('mint', () => {
        it('should call session transact with correct action', async () => {
            const mockSession = {
                auth: { actor: { toString: () => 'testuser' } },
                transact: jest.fn().mockResolvedValue({ transaction_id: 'abc123' })
            };

            const result = await nftMinter.mint(mockSession, 'QmTestImageCid');

            expect(mockSession.transact).toHaveBeenCalledWith({
                actions: [{
                    account: 'zoltaranwish',
                    name: 'mintnft',
                    authorization: [mockSession.auth],
                    data: {
                        player: 'testuser',
                        image_ipfs_cid: 'QmTestImageCid'
                    }
                }]
            });
            expect(result.transaction_id).toBe('abc123');
        });
    });

    describe('mintWish', () => {
        let mockSession;

        beforeEach(() => {
            mockSession = {
                auth: { actor: { toString: () => 'testplayer' } },
                transact: jest.fn().mockResolvedValue({ transaction_id: 'tx123' })
            };
        });

        it('should throw error for ineligible result code', async () => {
            await expect(
                nftMinter.mintWish(mockSession, 'my wish', 5, 100)
            ).rejects.toThrow('This result is not eligible for NFT minting');
        });

        it('should complete full minting flow for eligible result', async () => {
            const result = await nftMinter.mintWish(mockSession, 'I wish for happiness', 0, 42);

            expect(result.imageCID).toBeDefined();
            expect(result.imageCID.startsWith('Qm')).toBe(true);
            expect(result.rarity).toBe('Uncommon');
            expect(result.transactionResult.transaction_id).toBe('tx123');
        });

        it('should determine correct rarity for each result code', async () => {
            const testCases = [
                { resultCode: 3, expectedRarity: 'Legendary' },
                { resultCode: 2, expectedRarity: 'Epic' },
                { resultCode: 1, expectedRarity: 'Rare' },
                { resultCode: 0, expectedRarity: 'Uncommon' },
                { resultCode: 4, expectedRarity: 'Common' }
            ];

            for (const { resultCode, expectedRarity } of testCases) {
                const result = await nftMinter.mintWish(mockSession, 'test', resultCode, 1);
                expect(result.rarity).toBe(expectedRarity);
            }
        });
    });

    describe('integration with ConstellationIPFS', () => {
        it('should work with real ConstellationIPFS instance', () => {
            const ipfs = new ConstellationIPFS();
            const contract = new ZoltaranContract();
            const minter = new NFTMinter(ipfs, contract);

            expect(minter.ipfs.gateway).toBe('https://constellation.ubitquity.io/ipfs/');
            expect(minter.contract.contractAccount).toBe('zoltaranwish');
        });
    });
});
