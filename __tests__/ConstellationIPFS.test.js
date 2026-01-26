/**
 * Tests for ConstellationIPFS class
 * IPFS client for wish text storage
 */

const { ConstellationIPFS, CONFIG } = require('../src/classes');

describe('ConstellationIPFS', () => {
    let ipfsClient;

    beforeEach(() => {
        ipfsClient = new ConstellationIPFS();
    });

    describe('constructor', () => {
        it('should initialize with default CONFIG values', () => {
            expect(ipfsClient.gateway).toBe(CONFIG.ipfs.gateway);
            expect(ipfsClient.uploadUrl).toBe(CONFIG.ipfs.uploadUrl);
        });

        it('should accept custom config', () => {
            const customConfig = {
                ipfs: {
                    gateway: 'https://custom.gateway.io/ipfs/',
                    uploadUrl: 'https://custom.gateway.io/api/v0/add'
                }
            };
            const customClient = new ConstellationIPFS(customConfig);
            expect(customClient.gateway).toBe(customConfig.ipfs.gateway);
            expect(customClient.uploadUrl).toBe(customConfig.ipfs.uploadUrl);
        });
    });

    describe('getGatewayUrl', () => {
        it('should return correct gateway URL for CID', () => {
            const cid = 'QmTestCid123456789';
            const url = ipfsClient.getGatewayUrl(cid);
            expect(url).toBe(CONFIG.ipfs.gateway + cid);
        });

        it('should handle empty CID', () => {
            const url = ipfsClient.getGatewayUrl('');
            expect(url).toBe(CONFIG.ipfs.gateway);
        });

        it('should handle special characters in CID', () => {
            const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
            const url = ipfsClient.getGatewayUrl(cid);
            expect(url).toBe(CONFIG.ipfs.gateway + cid);
        });
    });

    describe('addWish', () => {
        it('should upload wish and return CID on success', async () => {
            const mockCid = 'QmSuccessfulUpload123';
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ Hash: mockCid })
            });

            const result = await ipfsClient.addWish('I wish for world peace');

            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledWith(
                CONFIG.ipfs.uploadUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );
            expect(result).toBe(mockCid);
        });

        it('should handle alternative cid response format', async () => {
            const mockCid = 'bafyAlternativeFormat';
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ cid: mockCid })
            });

            const result = await ipfsClient.addWish('Test wish');
            expect(result).toBe(mockCid);
        });

        it('should fallback to hash when upload fails', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const result = await ipfsClient.addWish('Fallback test wish');

            expect(result).toMatch(/^Qm[a-f0-9]{44}$/);
        });

        it('should fallback to hash when network error occurs', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await ipfsClient.addWish('Network error wish');

            expect(result).toMatch(/^Qm[a-f0-9]{44}$/);
        });

        it('should create wish data with correct structure', async () => {
            const mockCid = 'QmStructureTest';
            let capturedBody;

            global.fetch.mockImplementationOnce((url, options) => {
                capturedBody = options.body;
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ Hash: mockCid })
                });
            });

            const wishText = 'My special wish';
            await ipfsClient.addWish(wishText);

            // Verify FormData was created with proper structure
            expect(capturedBody).toBeInstanceOf(FormData);
            expect(capturedBody.data.file).toBeDefined();
        });

        it('should handle empty wish text', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ Hash: 'QmEmptyWish' })
            });

            const result = await ipfsClient.addWish('');
            expect(result).toBe('QmEmptyWish');
        });

        it('should handle very long wish text', async () => {
            const longWish = 'x'.repeat(10000);
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ Hash: 'QmLongWish' })
            });

            const result = await ipfsClient.addWish(longWish);
            expect(result).toBe('QmLongWish');
        });

        it('should handle special characters in wish text', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ Hash: 'QmSpecialChars' })
            });

            const result = await ipfsClient.addWish('Wish with émojis 🔮 and üñíçödé');
            expect(result).toBe('QmSpecialChars');
        });
    });
});
