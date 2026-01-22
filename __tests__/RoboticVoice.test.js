/**
 * Tests for RoboticVoice class
 * Speech synthesis for Zoltaran's voice
 */

const { RoboticVoice } = require('../src/classes');

describe('RoboticVoice', () => {
    let voice;

    beforeEach(() => {
        voice = new RoboticVoice();
        // Reset speechSynthesis mock
        global.speechSynthesis.speak.mockClear();
        global.speechSynthesis.cancel.mockClear();
        global.speechSynthesis.getVoices.mockClear();
    });

    describe('constructor', () => {
        it('should initialize with synth from window', () => {
            expect(voice.synth).toBe(global.speechSynthesis);
        });

        it('should initialize enabled as true', () => {
            expect(voice.enabled).toBe(true);
        });
    });

    describe('speak', () => {
        it('should return false when disabled', () => {
            voice.enabled = false;
            const result = voice.speak('Hello');
            expect(result).toBe(false);
            expect(speechSynthesis.speak).not.toHaveBeenCalled();
        });

        it('should return false when synth is null', () => {
            voice.synth = null;
            const result = voice.speak('Hello');
            expect(result).toBe(false);
        });

        it('should cancel previous speech', () => {
            voice.speak('Test');
            expect(speechSynthesis.cancel).toHaveBeenCalled();
        });

        it('should call speak with utterance', () => {
            voice.speak('Hello Zoltaran');
            expect(speechSynthesis.speak).toHaveBeenCalledWith(
                expect.any(SpeechSynthesisUtterance)
            );
        });

        it('should return true on success', () => {
            const result = voice.speak('Hello');
            expect(result).toBe(true);
        });

        it('should use default pitch of 0.1', () => {
            voice.speak('Test');
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.pitch).toBe(0.1);
        });

        it('should use default rate of 0.6', () => {
            voice.speak('Test');
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.rate).toBe(0.6);
        });

        it('should accept custom pitch', () => {
            voice.speak('Test', 0.5);
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.pitch).toBe(0.5);
        });

        it('should accept custom rate', () => {
            voice.speak('Test', 0.1, 0.8);
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.rate).toBe(0.8);
        });

        it('should set volume to 0.9', () => {
            voice.speak('Test');
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.volume).toBe(0.9);
        });

        it('should set the text correctly', () => {
            voice.speak('My wish is granted');
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.text).toBe('My wish is granted');
        });

        it('should select Daniel voice when available', () => {
            speechSynthesis.getVoices.mockReturnValueOnce([
                { name: 'Samantha', lang: 'en-US' },
                { name: 'Daniel', lang: 'en-GB' }
            ]);
            voice.speak('Test');
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.voice.name).toBe('Daniel');
        });

        it('should fallback to English voice', () => {
            speechSynthesis.getVoices.mockReturnValueOnce([
                { name: 'French', lang: 'fr-FR' },
                { name: 'English', lang: 'en-US' }
            ]);
            voice.speak('Test');
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.voice.lang).toBe('en-US');
        });

        it('should fallback to first voice if no English available', () => {
            speechSynthesis.getVoices.mockReturnValueOnce([
                { name: 'French', lang: 'fr-FR' },
                { name: 'German', lang: 'de-DE' }
            ]);
            voice.speak('Test');
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.voice.name).toBe('French');
        });

        it('should handle no voices available', () => {
            speechSynthesis.getVoices.mockReturnValueOnce([]);
            voice.speak('Test');
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            // When no voices available, voice is set to undefined from the array lookup
            expect(utterance.voice).toBeNull();
        });
    });

    describe('speakWishGranted', () => {
        it('should speak wish granted message', () => {
            voice.speakWishGranted();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.text).toBe('Your wish... is granted!');
        });

        it('should use pitch 0.1 and rate 0.55', () => {
            voice.speakWishGranted();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.pitch).toBe(0.1);
            expect(utterance.rate).toBe(0.55);
        });

        it('should return result from speak', () => {
            const result = voice.speakWishGranted();
            expect(result).toBe(true);
        });
    });

    describe('speakTokens', () => {
        it('should speak token reward message', () => {
            voice.speakTokens(500);
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.text).toBe('Have some tokens instead... 500 arcade tokens are yours!');
        });

        it('should include token amount in message', () => {
            voice.speakTokens(1000);
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.text).toContain('1000');
        });

        it('should use pitch 0.1 and rate 0.6', () => {
            voice.speakTokens(250);
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.pitch).toBe(0.1);
            expect(utterance.rate).toBe(0.6);
        });
    });

    describe('speakThinkAboutIt', () => {
        it('should speak think about it message', () => {
            voice.speakThinkAboutIt();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.text).toBe('I will think about it... Come back tomorrow for a free spin!');
        });

        it('should use pitch 0.15 and rate 0.55', () => {
            voice.speakThinkAboutIt();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.pitch).toBe(0.15);
            expect(utterance.rate).toBe(0.55);
        });
    });

    describe('speakTryAgain', () => {
        it('should speak try again message', () => {
            voice.speakTryAgain();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.text).toBe('The spirits are silent... Try again!');
        });

        it('should use pitch 0.1 and rate 0.6', () => {
            voice.speakTryAgain();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.pitch).toBe(0.1);
            expect(utterance.rate).toBe(0.6);
        });
    });

    describe('speakWelcome', () => {
        it('should speak welcome message', () => {
            voice.speakWelcome();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.text).toBe('Welcome, seeker of fortunes... Make your wish!');
        });

        it('should use pitch 0.1 and rate 0.5', () => {
            voice.speakWelcome();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.pitch).toBe(0.1);
            expect(utterance.rate).toBe(0.5);
        });
    });

    describe('speakMakingWish', () => {
        it('should speak making wish message', () => {
            voice.speakMakingWish();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.text).toBe('The spirits are listening...');
        });

        it('should use pitch 0.05 and rate 0.5', () => {
            voice.speakMakingWish();
            const utterance = speechSynthesis.speak.mock.calls[0][0];
            expect(utterance.pitch).toBe(0.05);
            expect(utterance.rate).toBe(0.5);
        });
    });

    describe('integration', () => {
        it('should not speak any message when disabled', () => {
            voice.enabled = false;

            expect(voice.speakWishGranted()).toBe(false);
            expect(voice.speakTokens(500)).toBe(false);
            expect(voice.speakThinkAboutIt()).toBe(false);
            expect(voice.speakTryAgain()).toBe(false);
            expect(voice.speakWelcome()).toBe(false);
            expect(voice.speakMakingWish()).toBe(false);

            expect(speechSynthesis.speak).not.toHaveBeenCalled();
        });
    });
});
