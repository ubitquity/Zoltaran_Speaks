/**
 * Tests for MemoGenerator class
 * Generates unique memos for blockchain transactions
 */

const { MemoGenerator } = require('../src/classes');

describe('MemoGenerator', () => {
    let memoGen;

    beforeEach(() => {
        memoGen = new MemoGenerator('test_key');
    });

    describe('constructor', () => {
        it('should initialize with provided key', () => {
            expect(memoGen.key).toBe('test_key');
        });

        it('should use default key when not provided', () => {
            const defaultGen = new MemoGenerator();
            expect(defaultGen.key).toBe('default_key');
        });

        it('should initialize counter based on Date.now()', () => {
            const before = Date.now();
            const gen = new MemoGenerator('key');
            const after = Date.now();

            expect(gen.counter).toBeGreaterThanOrEqual(before);
            expect(gen.counter).toBeLessThanOrEqual(after);
        });
    });

    describe('shortHash', () => {
        it('should return 8 character uppercase hex string', async () => {
            const hash = await memoGen.shortHash('test data');
            expect(hash).toMatch(/^[A-F0-9]{8}$/);
        });

        it('should produce different hashes for different data', async () => {
            const hash1 = await memoGen.shortHash('data1');
            const hash2 = await memoGen.shortHash('data2');
            expect(hash1).not.toBe(hash2);
        });

        it('should produce different hashes even for same data (counter increments)', async () => {
            const hash1 = await memoGen.shortHash('same data');
            const hash2 = await memoGen.shortHash('same data');
            expect(hash1).not.toBe(hash2);
        });

        it('should increment counter with each call', async () => {
            const initialCounter = memoGen.counter;
            await memoGen.shortHash('test1');
            await memoGen.shortHash('test2');
            expect(memoGen.counter).toBe(initialCounter + 2);
        });

        it('should handle empty data', async () => {
            const hash = await memoGen.shortHash('');
            expect(hash).toMatch(/^[A-F0-9]{8}$/);
        });

        it('should handle special characters', async () => {
            const hash = await memoGen.shortHash('🔮émoji✨');
            expect(hash).toMatch(/^[A-F0-9]{8}$/);
        });

        it('should handle very long data', async () => {
            const longData = 'x'.repeat(10000);
            const hash = await memoGen.shortHash(longData);
            expect(hash).toMatch(/^[A-F0-9]{8}$/);
        });
    });

    describe('purchaseMemo', () => {
        it('should generate memo starting with PW', async () => {
            const memo = await memoGen.purchaseMemo('testuser', 'XUSDC_10', 10);
            expect(memo).toMatch(/^PW[A-F0-9]{8}$/);
        });

        it('should include user, packId, and wishes in hash calculation', async () => {
            const memo1 = await memoGen.purchaseMemo('user1', 'XUSDC_10', 10);
            const memo2 = await memoGen.purchaseMemo('user2', 'XUSDC_10', 10);
            expect(memo1).not.toBe(memo2);
        });

        it('should generate unique memos for different packs', async () => {
            // Reset counter for predictable behavior
            memoGen.counter = 1000;

            const memo1 = await memoGen.purchaseMemo('user', 'XUSDC_10', 10);
            const memo2 = await memoGen.purchaseMemo('user', 'XUSDC_25', 25);
            expect(memo1).not.toBe(memo2);
        });

        it('should handle empty user', async () => {
            const memo = await memoGen.purchaseMemo('', 'ARCADE_5', 5);
            expect(memo).toMatch(/^PW[A-F0-9]{8}$/);
        });
    });

    describe('resultMemo', () => {
        it('should generate memo with result code prefix', async () => {
            const memo = await memoGen.resultMemo('testuser', 0, 0);
            expect(memo).toMatch(/^0[A-F0-9]{8}$/);
        });

        it('should include result code in prefix', async () => {
            const memo1 = await memoGen.resultMemo('user', 1, 250);
            const memo2 = await memoGen.resultMemo('user', 2, 500);

            expect(memo1).toMatch(/^1[A-F0-9]{8}$/);
            expect(memo2).toMatch(/^2[A-F0-9]{8}$/);
        });

        it('should include user, resultCode, and amount in hash calculation', async () => {
            const memo1 = await memoGen.resultMemo('user1', 0, 0);
            const memo2 = await memoGen.resultMemo('user2', 0, 0);
            expect(memo1).not.toBe(memo2);
        });

        it('should generate unique memos for same result code', async () => {
            // Even with same inputs, counter makes them unique
            const memo1 = await memoGen.resultMemo('user', 5, 0);
            const memo2 = await memoGen.resultMemo('user', 5, 0);
            expect(memo1).not.toBe(memo2);
        });

        it('should handle all result codes', async () => {
            for (let code = 0; code <= 5; code++) {
                const memo = await memoGen.resultMemo('user', code, 0);
                expect(memo).toMatch(new RegExp(`^${code}[A-F0-9]{8}$`));
            }
        });
    });

    describe('key sensitivity', () => {
        it('should produce different hashes with different keys', async () => {
            const gen1 = new MemoGenerator('key1');
            const gen2 = new MemoGenerator('key2');

            // Sync counters for comparison
            gen1.counter = 12345;
            gen2.counter = 12345;

            const hash1 = await gen1.shortHash('same data');
            const hash2 = await gen2.shortHash('same data');

            expect(hash1).not.toBe(hash2);
        });
    });
});
