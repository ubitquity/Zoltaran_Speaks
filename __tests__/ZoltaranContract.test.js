/**
 * Tests for ZoltaranContract class
 * Smart contract client for blockchain interactions
 */

const { ZoltaranContract, CRYPTOBETS_CONFIG, CONFIG } = require('../src/classes');

describe('ZoltaranContract', () => {
    let contract;
    let mockSession;

    beforeEach(() => {
        contract = new ZoltaranContract();

        mockSession = {
            auth: {
                actor: { toString: () => 'testuser1234' }
            },
            transact: jest.fn()
        };
    });

    describe('constructor', () => {
        it('should initialize with default config values', () => {
            expect(contract.contractAccount).toBe(CRYPTOBETS_CONFIG.CONTRACT_ACCOUNT);
            expect(contract.rpcEndpoint).toBe(CONFIG.endpoints[0]);
        });

        it('should accept custom config', () => {
            const customConfig = { CONTRACT_ACCOUNT: 'customcontract' };
            const customEndpoints = ['https://custom.endpoint.io'];
            const customContract = new ZoltaranContract(customConfig, customEndpoints);

            expect(customContract.contractAccount).toBe('customcontract');
            expect(customContract.rpcEndpoint).toBe('https://custom.endpoint.io');
        });
    });

    describe('commit', () => {
        it('should call transact with correct action data', async () => {
            const commitHash = 'abcd1234'.repeat(8);
            mockSession.transact.mockResolvedValueOnce({ transaction_id: 'tx123' });

            await contract.commit(mockSession, commitHash, 0);

            expect(mockSession.transact).toHaveBeenCalledWith({
                actions: [{
                    account: 'zoltaranwish',
                    name: 'commit',
                    authorization: [mockSession.auth],
                    data: {
                        player: 'testuser1234',
                        commit_hash: expect.any(Array),
                        wish_type: 0
                    }
                }]
            });
        });

        it('should convert hex string to byte array', async () => {
            const commitHash = 'ff00aa55';
            mockSession.transact.mockResolvedValueOnce({});

            await contract.commit(mockSession, commitHash, 1);

            const action = mockSession.transact.mock.calls[0][0].actions[0];
            expect(action.data.commit_hash).toEqual([255, 0, 170, 85]);
        });

        it('should handle wish_type FREE (0)', async () => {
            mockSession.transact.mockResolvedValueOnce({});
            await contract.commit(mockSession, 'aa'.repeat(32), 0);

            const action = mockSession.transact.mock.calls[0][0].actions[0];
            expect(action.data.wish_type).toBe(0);
        });

        it('should handle wish_type PURCHASED (1)', async () => {
            mockSession.transact.mockResolvedValueOnce({});
            await contract.commit(mockSession, 'bb'.repeat(32), 1);

            const action = mockSession.transact.mock.calls[0][0].actions[0];
            expect(action.data.wish_type).toBe(1);
        });

        it('should return transaction result', async () => {
            const expectedResult = { transaction_id: 'abc123', processed: {} };
            mockSession.transact.mockResolvedValueOnce(expectedResult);

            const result = await contract.commit(mockSession, 'cc'.repeat(32), 0);

            expect(result).toBe(expectedResult);
        });
    });

    describe('reveal', () => {
        it('should call transact with correct action data', async () => {
            mockSession.transact.mockResolvedValueOnce({ transaction_id: 'reveal123' });

            await contract.reveal(mockSession, 42, 'secretValue', 'QmTestCid');

            expect(mockSession.transact).toHaveBeenCalledWith({
                actions: [{
                    account: 'zoltaranwish',
                    name: 'reveal',
                    authorization: [mockSession.auth],
                    data: {
                        player: 'testuser1234',
                        commit_id: 42,
                        client_secret: 'secretValue',
                        wish_ipfs_cid: 'QmTestCid'
                    }
                }]
            });
        });

        it('should return transaction result', async () => {
            const expectedResult = { transaction_id: 'reveal456', processed: { action_traces: [] } };
            mockSession.transact.mockResolvedValueOnce(expectedResult);

            const result = await contract.reveal(mockSession, 1, 'secret', 'QmCid');

            expect(result).toBe(expectedResult);
        });
    });

    describe('getUserData', () => {
        it('should fetch user data from blockchain', async () => {
            const mockUserData = {
                account: 'testuser1234',
                purchased_wishes: 10,
                last_free_day: 19500,
                total_wishes: 100,
                total_wins: 25,
                tokens_won: 50000
            };

            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [mockUserData] })
            });

            const result = await contract.getUserData('testuser1234');

            expect(global.fetch).toHaveBeenCalledWith(
                `${CONFIG.endpoints[0]}/v1/chain/get_table_rows`,
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
            expect(result).toEqual(mockUserData);
        });

        it('should return null for non-existent user', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            const result = await contract.getUserData('nonexistent');

            expect(result).toBeNull();
        });

        it('should return null on network error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await contract.getUserData('testuser');

            expect(result).toBeNull();
        });

        it('should query correct table with bounds', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            await contract.getUserData('myaccount123');

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.table).toBe('users');
            expect(callBody.lower_bound).toBe('myaccount123');
            expect(callBody.upper_bound).toBe('myaccount123');
        });
    });

    describe('getLeaderboard', () => {
        it('should fetch leaderboard from blockchain', async () => {
            const mockLeaderboard = [
                { player: 'player1', wins: 100, tokens_won: 50000 },
                { player: 'player2', wins: 80, tokens_won: 40000 },
                { player: 'player3', wins: 60, tokens_won: 30000 }
            ];

            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: mockLeaderboard })
            });

            const result = await contract.getLeaderboard(3);

            expect(result).toEqual(mockLeaderboard);
        });

        it('should default to limit of 3', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            await contract.getLeaderboard();

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.limit).toBe(3);
        });

        it('should accept custom limit', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            await contract.getLeaderboard(10);

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.limit).toBe(10);
        });

        it('should return empty array on error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Failed'));

            const result = await contract.getLeaderboard();

            expect(result).toEqual([]);
        });

        it('should use secondary index for sorting', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            await contract.getLeaderboard();

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.index_position).toBe(2);
        });
    });

    describe('getRecentHistory', () => {
        it('should fetch recent history from blockchain', async () => {
            const mockHistory = [
                { id: 100, player: 'user1', result_code: 0, tokens_won: 0 },
                { id: 99, player: 'user2', result_code: 1, tokens_won: 250 }
            ];

            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: mockHistory })
            });

            const result = await contract.getRecentHistory(10);

            expect(result).toEqual(mockHistory);
        });

        it('should default to limit of 10', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            await contract.getRecentHistory();

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.limit).toBe(10);
        });

        it('should query in reverse order', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            await contract.getRecentHistory();

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.reverse).toBe(true);
        });

        it('should return empty array on error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Failed'));

            const result = await contract.getRecentHistory();

            expect(result).toEqual([]);
        });
    });

    describe('getPendingCommit', () => {
        it('should fetch pending commit for account', async () => {
            const mockCommit = {
                id: 5,
                player: 'testuser1234',
                commit_hash: 'abc123',
                block_num: 1000
            };

            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [mockCommit] })
            });

            const result = await contract.getPendingCommit('testuser1234');

            expect(result).toEqual(mockCommit);
        });

        it('should return null if no pending commit', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            const result = await contract.getPendingCommit('testuser1234');

            expect(result).toBeNull();
        });

        it('should return null on error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await contract.getPendingCommit('testuser1234');

            expect(result).toBeNull();
        });

        it('should use byplayer secondary index', async () => {
            global.fetch.mockResolvedValueOnce({
                json: async () => ({ rows: [] })
            });

            await contract.getPendingCommit('myaccount');

            const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(callBody.table).toBe('commits');
            expect(callBody.index_position).toBe(2);
        });
    });

    describe('parseRevealResult', () => {
        it('should return TRY_AGAIN (5) when no tokens won', () => {
            const txResult = { processed: { action_traces: [] } };
            const result = contract.parseRevealResult(txResult);

            expect(result.resultCode).toBe(5);
            expect(result.tokensWon).toBe(0);
        });

        it('should detect TOKENS_250 outcome', () => {
            const txResult = {
                processed: {
                    action_traces: [{
                        inline_traces: [{
                            act: {
                                name: 'transfer',
                                account: 'tokencreate',
                                data: { quantity: '250.00000000 ARCADE' }
                            }
                        }]
                    }]
                }
            };

            const result = contract.parseRevealResult(txResult);

            expect(result.resultCode).toBe(1);
            expect(result.tokensWon).toBe(250);
        });

        it('should detect TOKENS_500 outcome', () => {
            const txResult = {
                processed: {
                    action_traces: [{
                        inline_traces: [{
                            act: {
                                name: 'transfer',
                                account: 'tokencreate',
                                data: { quantity: '500.00000000 ARCADE' }
                            }
                        }]
                    }]
                }
            };

            const result = contract.parseRevealResult(txResult);

            expect(result.resultCode).toBe(2);
            expect(result.tokensWon).toBe(500);
        });

        it('should detect TOKENS_1000 outcome', () => {
            const txResult = {
                processed: {
                    action_traces: [{
                        inline_traces: [{
                            act: {
                                name: 'transfer',
                                account: 'tokencreate',
                                data: { quantity: '1000.00000000 ARCADE' }
                            }
                        }]
                    }]
                }
            };

            const result = contract.parseRevealResult(txResult);

            expect(result.resultCode).toBe(3);
            expect(result.tokensWon).toBe(1000);
        });

        it('should handle null transaction result', () => {
            const result = contract.parseRevealResult(null);

            expect(result.resultCode).toBe(5);
            expect(result.tokensWon).toBe(0);
        });

        it('should handle undefined transaction result', () => {
            const result = contract.parseRevealResult(undefined);

            expect(result.resultCode).toBe(5);
            expect(result.tokensWon).toBe(0);
        });

        it('should handle missing action_traces', () => {
            const result = contract.parseRevealResult({ processed: {} });

            expect(result.resultCode).toBe(5);
            expect(result.tokensWon).toBe(0);
        });

        it('should handle missing inline_traces', () => {
            const txResult = {
                processed: {
                    action_traces: [{}]
                }
            };

            const result = contract.parseRevealResult(txResult);

            expect(result.resultCode).toBe(5);
            expect(result.tokensWon).toBe(0);
        });

        it('should ignore non-transfer actions', () => {
            const txResult = {
                processed: {
                    action_traces: [{
                        inline_traces: [{
                            act: {
                                name: 'other_action',
                                account: 'tokencreate',
                                data: { quantity: '1000.00000000 ARCADE' }
                            }
                        }]
                    }]
                }
            };

            const result = contract.parseRevealResult(txResult);

            expect(result.tokensWon).toBe(0);
        });

        it('should ignore transfers from wrong contract', () => {
            const txResult = {
                processed: {
                    action_traces: [{
                        inline_traces: [{
                            act: {
                                name: 'transfer',
                                account: 'other_contract',
                                data: { quantity: '1000.00000000 ARCADE' }
                            }
                        }]
                    }]
                }
            };

            const result = contract.parseRevealResult(txResult);

            expect(result.tokensWon).toBe(0);
        });
    });
});
