/**
 * Tests for SpookyAudioEngine class
 * Audio effects engine using Web Audio API
 */

const { SpookyAudioEngine } = require('../src/classes');

describe('SpookyAudioEngine', () => {
    let audioEngine;

    beforeEach(() => {
        audioEngine = new SpookyAudioEngine();
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            expect(audioEngine.audioContext).toBeNull();
            expect(audioEngine.enabled).toBe(true);
            expect(audioEngine.bgMusicPlaying).toBe(false);
            expect(audioEngine.bgMusicGain).toBeNull();
            expect(audioEngine.masterGain).toBeNull();
            expect(audioEngine.initialized).toBe(false);
        });
    });

    describe('init', () => {
        it('should initialize AudioContext', async () => {
            const result = await audioEngine.init();

            expect(result).toBe(true);
            expect(audioEngine.audioContext).toBeDefined();
            expect(audioEngine.masterGain).toBeDefined();
            expect(audioEngine.initialized).toBe(true);
        });

        it('should only initialize once', async () => {
            await audioEngine.init();
            const firstContext = audioEngine.audioContext;

            await audioEngine.init();

            expect(audioEngine.audioContext).toBe(firstContext);
        });

        it('should set master gain to 0.5', async () => {
            await audioEngine.init();

            expect(audioEngine.masterGain.gain.value).toBe(0.5);
        });

        it('should handle AudioContext unavailable', async () => {
            const originalAudioContext = global.AudioContext;
            global.AudioContext = undefined;
            global.webkitAudioContext = undefined;

            const newEngine = new SpookyAudioEngine();
            const result = await newEngine.init();

            expect(result).toBe(false);

            global.AudioContext = originalAudioContext;
        });
    });

    describe('toggle', () => {
        it('should toggle enabled state', () => {
            expect(audioEngine.enabled).toBe(true);

            audioEngine.toggle();
            expect(audioEngine.enabled).toBe(false);

            audioEngine.toggle();
            expect(audioEngine.enabled).toBe(true);
        });

        it('should return new enabled state', () => {
            const result1 = audioEngine.toggle();
            expect(result1).toBe(false);

            const result2 = audioEngine.toggle();
            expect(result2).toBe(true);
        });

        it('should mute bgMusicGain when disabled', () => {
            audioEngine.bgMusicGain = { gain: { value: 0.03 } };
            audioEngine.toggle();

            expect(audioEngine.bgMusicGain.gain.value).toBe(0);
        });

        it('should restore bgMusicGain when enabled', () => {
            audioEngine.bgMusicGain = { gain: { value: 0 } };
            audioEngine.enabled = false;

            audioEngine.toggle();

            expect(audioEngine.bgMusicGain.gain.value).toBe(0.03);
        });

        it('should update audioToggle element text when it exists', () => {
            // Create a mock element
            const mockElement = { textContent: '' };
            const originalGetElementById = document.getElementById;
            document.getElementById = jest.fn((id) => {
                if (id === 'audioToggle') return mockElement;
                return null;
            });

            // Toggle to disabled
            audioEngine.enabled = true;
            audioEngine.toggle();
            expect(mockElement.textContent).toBe('🔇');

            // Toggle to enabled
            audioEngine.toggle();
            expect(mockElement.textContent).toBe('🔊');

            // Restore original
            document.getElementById = originalGetElementById;
        });
    });

    describe('playAmbientDrone', () => {
        it('should be disabled (returns immediately)', () => {
            const result = audioEngine.playAmbientDrone();
            expect(result).toBeUndefined();
        });
    });

    describe('playLaugh', () => {
        it('should return false when disabled', () => {
            audioEngine.enabled = false;
            const result = audioEngine.playLaugh();
            expect(result).toBe(false);
        });

        it('should return false when no audioContext', () => {
            audioEngine.audioContext = null;
            const result = audioEngine.playLaugh();
            expect(result).toBe(false);
        });

        it('should return true when enabled with audioContext', async () => {
            await audioEngine.init();
            const result = audioEngine.playLaugh();
            expect(result).toBe(true);
        });
    });

    describe('playEvilLaugh', () => {
        it('should return false when disabled', () => {
            audioEngine.enabled = false;
            const result = audioEngine.playEvilLaugh();
            expect(result).toBe(false);
        });

        it('should return false when no audioContext', () => {
            audioEngine.audioContext = null;
            const result = audioEngine.playEvilLaugh();
            expect(result).toBe(false);
        });

        it('should return true when enabled with audioContext', async () => {
            await audioEngine.init();
            const result = audioEngine.playEvilLaugh();
            expect(result).toBe(true);
        });
    });

    describe('playCrystalActivate', () => {
        it('should return false when disabled', () => {
            audioEngine.enabled = false;
            const result = audioEngine.playCrystalActivate();
            expect(result).toBe(false);
        });

        it('should return false when no audioContext', () => {
            audioEngine.audioContext = null;
            const result = audioEngine.playCrystalActivate();
            expect(result).toBe(false);
        });

        it('should return true when enabled with audioContext', async () => {
            await audioEngine.init();
            const result = audioEngine.playCrystalActivate();
            expect(result).toBe(true);
        });
    });

    describe('playMagicReveal', () => {
        it('should return false when disabled', () => {
            audioEngine.enabled = false;
            const result = audioEngine.playMagicReveal();
            expect(result).toBe(false);
        });

        it('should return false when no audioContext', () => {
            audioEngine.audioContext = null;
            const result = audioEngine.playMagicReveal();
            expect(result).toBe(false);
        });

        it('should return true when enabled with audioContext', async () => {
            await audioEngine.init();
            const result = audioEngine.playMagicReveal();
            expect(result).toBe(true);
        });
    });

    describe('playSadSound', () => {
        it('should return false when disabled', () => {
            audioEngine.enabled = false;
            const result = audioEngine.playSadSound();
            expect(result).toBe(false);
        });

        it('should return false when no audioContext', () => {
            audioEngine.audioContext = null;
            const result = audioEngine.playSadSound();
            expect(result).toBe(false);
        });

        it('should return true when enabled with audioContext', async () => {
            await audioEngine.init();
            const result = audioEngine.playSadSound();
            expect(result).toBe(true);
        });
    });

    describe('playCoinSound', () => {
        it('should return false when disabled', () => {
            audioEngine.enabled = false;
            const result = audioEngine.playCoinSound();
            expect(result).toBe(false);
        });

        it('should return false when no audioContext', () => {
            audioEngine.audioContext = null;
            const result = audioEngine.playCoinSound();
            expect(result).toBe(false);
        });

        it('should return true when enabled with audioContext', async () => {
            await audioEngine.init();
            const result = audioEngine.playCoinSound();
            expect(result).toBe(true);
        });
    });

    describe('integration', () => {
        it('should allow toggling off and then sounds should not play', async () => {
            await audioEngine.init();

            audioEngine.toggle(); // disable

            expect(audioEngine.playLaugh()).toBe(false);
            expect(audioEngine.playEvilLaugh()).toBe(false);
            expect(audioEngine.playCrystalActivate()).toBe(false);
            expect(audioEngine.playMagicReveal()).toBe(false);
            expect(audioEngine.playSadSound()).toBe(false);
            expect(audioEngine.playCoinSound()).toBe(false);
        });

        it('should allow re-enabling sounds', async () => {
            await audioEngine.init();
            audioEngine.toggle(); // disable
            audioEngine.toggle(); // enable

            expect(audioEngine.playLaugh()).toBe(true);
        });
    });
});
