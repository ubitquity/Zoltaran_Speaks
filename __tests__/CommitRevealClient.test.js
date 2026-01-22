/**
 * Tests for CommitRevealClient class
 * Handles provably fair RNG through commit-reveal scheme
 */

const { CommitRevealClient } = require('../src/classes');

describe('CommitRevealClient', () => {
    let client;

    beforeEach(() => {
        // Clear localStorage before each test to avoid test pollution
        localStorage.removeItem('zoltaran_pending_reveal');
        client = new CommitRevealClient();
    });

    describe('constructor', () => {
        it('should initialize with null pendingReveal', () => {
            expect(client.pendingReveal).toBeNull();
        });
    });

    describe('generateSecret', () => {
        it('should generate a 64-character hex string', async () => {
            const secret = await client.generateSecret();
            expect(secret).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should generate unique secrets each time', async () => {
            const secret1 = await client.generateSecret();
            const secret2 = await client.generateSecret();
            expect(secret1).not.toBe(secret2);
        });

        it('should generate cryptographically random values', async () => {
            const secrets = [];
            for (let i = 0; i < 10; i++) {
                secrets.push(await client.generateSecret());
            }

            // All should be unique
            const uniqueSecrets = new Set(secrets);
            expect(uniqueSecrets.size).toBe(10);
        });
    });

    describe('generateCommitment', () => {
        it('should generate a 64-character hex hash', async () => {
            const secret = 'a'.repeat(64);
            const cid = 'QmTestCid123';
            const commitment = await client.generateCommitment(secret, cid);

            expect(commitment).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should produce consistent hashes for same inputs', async () => {
            const secret = 'abc123';
            const cid = 'QmSameCid';

            const hash1 = await client.generateCommitment(secret, cid);
            const hash2 = await client.generateCommitment(secret, cid);

            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different secrets', async () => {
            const cid = 'QmSameCid';

            const hash1 = await client.generateCommitment('secret1', cid);
            const hash2 = await client.generateCommitment('secret2', cid);

            expect(hash1).not.toBe(hash2);
        });

        it('should produce different hashes for different CIDs', async () => {
            const secret = 'sameSecret';

            const hash1 = await client.generateCommitment(secret, 'QmCid1');
            const hash2 = await client.generateCommitment(secret, 'QmCid2');

            expect(hash1).not.toBe(hash2);
        });

        it('should handle empty inputs', async () => {
            const hash = await client.generateCommitment('', '');
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should handle special characters', async () => {
            const hash = await client.generateCommitment('sécrét🔑', 'Qm🔮émoji');
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('storePendingReveal', () => {
        it('should store pending reveal in memory', () => {
            client.storePendingReveal(1, 'secret123', 'QmCid456');

            expect(client.pendingReveal).toEqual({
                commitId: 1,
                clientSecret: 'secret123',
                wishIpfsCid: 'QmCid456'
            });
        });

        it('should store pending reveal in localStorage', () => {
            client.storePendingReveal(42, 'mySecret', 'QmMyCid');

            // Verify localStorage was called
            const storedValue = localStorage.getItem('zoltaran_pending_reveal');
            expect(storedValue).toBe(JSON.stringify({
                commitId: 42,
                clientSecret: 'mySecret',
                wishIpfsCid: 'QmMyCid'
            }));
        });

        it('should overwrite previous pending reveal', () => {
            client.storePendingReveal(1, 'first', 'QmFirst');
            client.storePendingReveal(2, 'second', 'QmSecond');

            expect(client.pendingReveal.commitId).toBe(2);
            expect(client.pendingReveal.clientSecret).toBe('second');
        });
    });

    describe('getPendingReveal', () => {
        it('should return null when no pending reveal', () => {
            const freshClient = new CommitRevealClient();
            expect(freshClient.getPendingReveal()).toBeNull();
        });

        it('should return stored pending reveal from memory', () => {
            client.pendingReveal = {
                commitId: 5,
                clientSecret: 'test',
                wishIpfsCid: 'QmTest'
            };

            const result = client.getPendingReveal();

            expect(result).toEqual({
                commitId: 5,
                clientSecret: 'test',
                wishIpfsCid: 'QmTest'
            });
        });

        it('should restore from localStorage when memory is empty', () => {
            const storedData = {
                commitId: 99,
                clientSecret: 'restored',
                wishIpfsCid: 'QmRestored'
            };
            // Use the localStorage mock properly
            localStorage.setItem('zoltaran_pending_reveal', JSON.stringify(storedData));

            // Create fresh client with no memory but localStorage has data
            const freshClient = new CommitRevealClient();
            const result = freshClient.getPendingReveal();

            expect(result).toEqual(storedData);
            expect(freshClient.pendingReveal).toEqual(storedData);
        });

        it('should prefer memory over localStorage', () => {
            client.pendingReveal = { commitId: 1, clientSecret: 'memory', wishIpfsCid: 'QmMem' };
            localStorage.setItem('zoltaran_pending_reveal', JSON.stringify({
                commitId: 2, clientSecret: 'storage', wishIpfsCid: 'QmStore'
            }));

            const result = client.getPendingReveal();

            expect(result.clientSecret).toBe('memory');
        });
    });

    describe('clearPendingReveal', () => {
        it('should clear memory', () => {
            client.pendingReveal = { commitId: 1, clientSecret: 'x', wishIpfsCid: 'y' };
            client.clearPendingReveal();

            expect(client.pendingReveal).toBeNull();
        });

        it('should remove from localStorage', () => {
            // First store something
            localStorage.setItem('zoltaran_pending_reveal', 'test');

            client.clearPendingReveal();

            // Verify it was removed
            expect(localStorage.getItem('zoltaran_pending_reveal')).toBeNull();
        });

        it('should be idempotent', () => {
            client.clearPendingReveal();
            client.clearPendingReveal();

            expect(client.pendingReveal).toBeNull();
        });
    });

    describe('full commit-reveal flow', () => {
        it('should generate, store, retrieve, and clear reveal data', async () => {
            // Generate secret
            const secret = await client.generateSecret();
            expect(secret).toMatch(/^[a-f0-9]{64}$/);

            // Generate commitment
            const cid = 'QmFullFlowTest';
            const commitment = await client.generateCommitment(secret, cid);
            expect(commitment).toMatch(/^[a-f0-9]{64}$/);

            // Store pending reveal
            const commitId = 123;
            client.storePendingReveal(commitId, secret, cid);

            // Retrieve pending reveal
            const pending = client.getPendingReveal();
            expect(pending.commitId).toBe(commitId);
            expect(pending.clientSecret).toBe(secret);
            expect(pending.wishIpfsCid).toBe(cid);

            // Clear after reveal
            client.clearPendingReveal();
            expect(client.getPendingReveal()).toBeNull();
        });
    });
});
