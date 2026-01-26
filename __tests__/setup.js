/**
 * Jest Test Setup
 * Configures global mocks and test environment
 */

// Mock Web Crypto API
const nodeCrypto = require('crypto');

// Create a proper crypto.subtle mock
const cryptoSubtle = {
    digest: async (algorithm, data) => {
        const hash = nodeCrypto.createHash('sha256');
        // Buffer.from handles both Buffer and Uint8Array input
        hash.update(Buffer.from(data));
        const result = hash.digest();
        // Return an ArrayBuffer
        return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    }
};

const cryptoMock = {
    getRandomValues: (array) => {
        const bytes = nodeCrypto.randomBytes(array.length);
        array.set(bytes);
        return array;
    },
    subtle: cryptoSubtle
};

// Override global.crypto entirely using Object.defineProperty to make it non-configurable
Object.defineProperty(global, 'crypto', {
    value: cryptoMock,
    writable: true,
    configurable: true
});

// Also set it on globalThis for newer Node.js versions
if (typeof globalThis !== 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
        value: cryptoMock,
        writable: true,
        configurable: true
    });
}

// For JSDOM environment, also set on window
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'crypto', {
        value: cryptoMock,
        writable: true,
        configurable: true
    });
}

// Mock localStorage - needs to be a proper mock with persistent store
let localStorageStore = {};

const localStorageMock = {
    get store() { return localStorageStore; },
    getItem: jest.fn((key) => localStorageStore[key] || null),
    setItem: jest.fn((key, value) => { localStorageStore[key] = value; }),
    removeItem: jest.fn((key) => { delete localStorageStore[key]; }),
    clear: jest.fn(() => { localStorageStore = {}; }),
    _resetStore: () => { localStorageStore = {}; }
};
global.localStorage = localStorageMock;

// Mock AudioContext
class MockOscillatorNode {
    connect() { return this; }
    start() {}
    stop() {}
    frequency = { value: 0, setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() };
}

class MockGainNode {
    connect() { return this; }
    gain = { value: 0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() };
}

class MockAudioContext {
    destination = {};
    currentTime = 0;
    createOscillator() { return new MockOscillatorNode(); }
    createGain() { return new MockGainNode(); }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock SpeechSynthesis
class MockSpeechSynthesisUtterance {
    constructor(text) {
        this.text = text;
        this.pitch = 1;
        this.rate = 1;
        this.volume = 1;
        this.voice = null;
    }
}

const mockSpeechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => [
        { name: 'Daniel', lang: 'en-US' },
        { name: 'Samantha', lang: 'en-US' }
    ])
};

global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
global.speechSynthesis = mockSpeechSynthesis;

// Mock fetch
global.fetch = jest.fn();

// Mock FormData
class MockFormData {
    constructor() {
        this.data = {};
    }
    append(key, value, filename) {
        this.data[key] = { value, filename };
    }
}
global.FormData = MockFormData;

// Mock Blob
class MockBlob {
    constructor(parts, options) {
        this.parts = parts;
        this.type = options?.type || '';
    }
}
global.Blob = MockBlob;

// Mock TextEncoder
class MockTextEncoder {
    encode(str) {
        return Buffer.from(str, 'utf-8');
    }
}
global.TextEncoder = MockTextEncoder;

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock._resetStore();
    global.fetch.mockReset();
});
