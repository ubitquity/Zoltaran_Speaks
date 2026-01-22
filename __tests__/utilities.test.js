/**
 * Tests for utility functions
 * Helper functions used across the application
 */

const {
    formatTokenAmount,
    parseTokenAmount,
    isValidProtonAccount,
    sanitizeInput,
    getCurrentDayNumber,
    OUTCOME_CODES,
    CONFIG,
    CRYPTOBETS_CONFIG
} = require('../src/classes');

describe('Utility Functions', () => {

    describe('formatTokenAmount', () => {
        it('should format amount with 8 decimal precision', () => {
            const result = formatTokenAmount(25000000000, 8);
            expect(result).toBe('250.00000000');
        });

        it('should format amount with 6 decimal precision', () => {
            const result = formatTokenAmount(1000000, 6);
            expect(result).toBe('1.000000');
        });

        it('should format amount with 4 decimal precision', () => {
            const result = formatTokenAmount(10000, 4);
            expect(result).toBe('1.0000');
        });

        it('should handle zero amount', () => {
            const result = formatTokenAmount(0, 8);
            expect(result).toBe('0.00000000');
        });

        it('should handle large amounts', () => {
            const result = formatTokenAmount(100000000000000, 8);
            expect(result).toBe('1000000.00000000');
        });

        it('should handle small amounts', () => {
            const result = formatTokenAmount(1, 8);
            expect(result).toBe('0.00000001');
        });

        it('should handle fractional amounts', () => {
            const result = formatTokenAmount(12345678, 8);
            expect(result).toBe('0.12345678');
        });
    });

    describe('parseTokenAmount', () => {
        it('should parse decimal string to integer with 8 precision', () => {
            const result = parseTokenAmount('250.00000000', 8);
            expect(result).toBe(25000000000);
        });

        it('should parse decimal string to integer with 6 precision', () => {
            const result = parseTokenAmount('1.000000', 6);
            expect(result).toBe(1000000);
        });

        it('should parse decimal string to integer with 4 precision', () => {
            const result = parseTokenAmount('1.0000', 4);
            expect(result).toBe(10000);
        });

        it('should handle zero', () => {
            const result = parseTokenAmount('0', 8);
            expect(result).toBe(0);
        });

        it('should handle integer string', () => {
            const result = parseTokenAmount('100', 8);
            expect(result).toBe(10000000000);
        });

        it('should handle partial decimals', () => {
            const result = parseTokenAmount('1.5', 8);
            expect(result).toBe(150000000);
        });

        it('should round to nearest integer', () => {
            const result = parseTokenAmount('0.123456789', 8);
            expect(result).toBe(12345679); // Rounded
        });
    });

    describe('isValidProtonAccount', () => {
        it('should accept valid 12 character name', () => {
            expect(isValidProtonAccount('testaccount1')).toBe(true);
        });

        it('should accept valid 1 character name', () => {
            expect(isValidProtonAccount('a')).toBe(true);
        });

        it('should accept name with dots', () => {
            expect(isValidProtonAccount('test.account')).toBe(true);
        });

        it('should accept name with numbers 1-5', () => {
            expect(isValidProtonAccount('test12345')).toBe(true);
        });

        it('should reject name with 6-9', () => {
            expect(isValidProtonAccount('test6789')).toBe(false);
        });

        it('should reject name with 0', () => {
            expect(isValidProtonAccount('test0')).toBe(false);
        });

        it('should reject uppercase letters', () => {
            expect(isValidProtonAccount('TestAccount')).toBe(false);
        });

        it('should reject name longer than 12 characters', () => {
            expect(isValidProtonAccount('verylongaccount')).toBe(false);
        });

        it('should reject empty string', () => {
            expect(isValidProtonAccount('')).toBe(false);
        });

        it('should reject special characters', () => {
            expect(isValidProtonAccount('test@account')).toBe(false);
            expect(isValidProtonAccount('test-account')).toBe(false);
            expect(isValidProtonAccount('test_account')).toBe(false);
        });

        it('should reject spaces', () => {
            expect(isValidProtonAccount('test account')).toBe(false);
        });
    });

    describe('sanitizeInput', () => {
        it('should return empty string for non-string input', () => {
            expect(sanitizeInput(123)).toBe('');
            expect(sanitizeInput(null)).toBe('');
            expect(sanitizeInput(undefined)).toBe('');
            expect(sanitizeInput({})).toBe('');
        });

        it('should remove < and > characters', () => {
            expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
        });

        it('should remove javascript: protocol', () => {
            expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
            expect(sanitizeInput('JAVASCRIPT:alert(1)')).toBe('alert(1)');
        });

        it('should remove event handlers', () => {
            expect(sanitizeInput('onclick=alert(1)')).toBe('alert(1)');
            expect(sanitizeInput('onmouseover=bad()')).toBe('bad()');
            expect(sanitizeInput('ONERROR=hack()')).toBe('hack()');
        });

        it('should trim whitespace', () => {
            expect(sanitizeInput('  hello  ')).toBe('hello');
        });

        it('should truncate to 500 characters', () => {
            const longString = 'x'.repeat(1000);
            const result = sanitizeInput(longString);
            expect(result.length).toBe(500);
        });

        it('should handle normal input unchanged', () => {
            expect(sanitizeInput('I wish for happiness')).toBe('I wish for happiness');
        });

        it('should handle empty string', () => {
            expect(sanitizeInput('')).toBe('');
        });

        it('should handle unicode characters', () => {
            expect(sanitizeInput('🔮 My wish 🌟')).toBe('🔮 My wish 🌟');
        });

        it('should handle multiple violations', () => {
            const input = '<script>javascript:onclick=bad()</script>';
            const result = sanitizeInput(input);
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).not.toContain('javascript:');
            expect(result).not.toContain('onclick=');
        });
    });

    describe('getCurrentDayNumber', () => {
        it('should return a positive integer', () => {
            const day = getCurrentDayNumber();
            expect(day).toBeGreaterThan(0);
            expect(Number.isInteger(day)).toBe(true);
        });

        it('should return consistent value within same day', () => {
            const day1 = getCurrentDayNumber();
            const day2 = getCurrentDayNumber();
            expect(day1).toBe(day2);
        });

        it('should return days since Unix epoch', () => {
            // Day 0 was January 1, 1970
            // We should be well past day 19000 (2022+)
            const day = getCurrentDayNumber();
            expect(day).toBeGreaterThan(19000);
        });
    });
});

describe('Constants', () => {

    describe('OUTCOME_CODES', () => {
        it('should have 6 outcome codes (0-5)', () => {
            expect(Object.keys(OUTCOME_CODES).length).toBe(6);
        });

        it('should have WISH_GRANTED at code 0', () => {
            expect(OUTCOME_CODES[0].key).toBe('WISH_GRANTED');
            expect(OUTCOME_CODES[0].type).toBe('win');
        });

        it('should have TOKENS_250 at code 1', () => {
            expect(OUTCOME_CODES[1].key).toBe('TOKENS_250');
            expect(OUTCOME_CODES[1].amount).toBe(250);
        });

        it('should have TOKENS_500 at code 2', () => {
            expect(OUTCOME_CODES[2].key).toBe('TOKENS_500');
            expect(OUTCOME_CODES[2].amount).toBe(500);
        });

        it('should have TOKENS_1000 at code 3', () => {
            expect(OUTCOME_CODES[3].key).toBe('TOKENS_1000');
            expect(OUTCOME_CODES[3].amount).toBe(1000);
        });

        it('should have FREE_SPIN at code 4', () => {
            expect(OUTCOME_CODES[4].key).toBe('FREE_SPIN');
            expect(OUTCOME_CODES[4].type).toBe('spin');
        });

        it('should have TRY_AGAIN at code 5', () => {
            expect(OUTCOME_CODES[5].key).toBe('TRY_AGAIN');
            expect(OUTCOME_CODES[5].type).toBe('lose');
        });

        it('should have icons for all outcomes', () => {
            for (let code = 0; code <= 5; code++) {
                expect(OUTCOME_CODES[code].icon).toBeDefined();
                expect(OUTCOME_CODES[code].icon.length).toBeGreaterThan(0);
            }
        });

        it('should have labels for all outcomes', () => {
            for (let code = 0; code <= 5; code++) {
                expect(OUTCOME_CODES[code].label).toBeDefined();
                expect(OUTCOME_CODES[code].label.length).toBeGreaterThan(0);
            }
        });
    });

    describe('CONFIG', () => {
        it('should have appName', () => {
            expect(CONFIG.appName).toBe('Psychic Traveller');
        });

        it('should have chainId', () => {
            expect(CONFIG.chainId).toBeDefined();
            expect(CONFIG.chainId.length).toBe(64);
        });

        it('should have endpoints array', () => {
            expect(Array.isArray(CONFIG.endpoints)).toBe(true);
            expect(CONFIG.endpoints.length).toBeGreaterThan(0);
        });

        it('should have contracts object', () => {
            expect(CONFIG.contracts.arcade).toBeDefined();
            expect(CONFIG.contracts.zoltaran).toBeDefined();
        });

        it('should have ipfs configuration', () => {
            expect(CONFIG.ipfs.gateway).toBeDefined();
            expect(CONFIG.ipfs.uploadUrl).toBeDefined();
        });
    });

    describe('CRYPTOBETS_CONFIG', () => {
        it('should have CONTRACT_ACCOUNT', () => {
            expect(CRYPTOBETS_CONFIG.CONTRACT_ACCOUNT).toBe('zoltaranwish');
        });

        it('should have TOKEN_CONTRACTS mapping', () => {
            expect(CRYPTOBETS_CONFIG.TOKEN_CONTRACTS.XUSDC).toBe('xtokens');
            expect(CRYPTOBETS_CONFIG.TOKEN_CONTRACTS.ARCADE).toBe('tokencreate');
        });

        it('should have TOKEN_PRECISION mapping', () => {
            expect(CRYPTOBETS_CONFIG.TOKEN_PRECISION.XUSDC).toBe(6);
            expect(CRYPTOBETS_CONFIG.TOKEN_PRECISION.ARCADE).toBe(8);
        });

        it('should have TOKEN_BONUSES mapping', () => {
            expect(CRYPTOBETS_CONFIG.TOKEN_BONUSES.ARCADE).toBe(2.0);
            expect(CRYPTOBETS_CONFIG.TOKEN_BONUSES.XUSDC).toBe(3.5);
        });
    });
});
