import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGame } from '@/composables/useGame';

vi.mock('@/data/words', () => ({
    ANSWERS: ['crane'],
    // 'nacre' vs 'crane': n→present a→present c→present r→present e→correct (4 yellows, 1 green)
    // 'train' is included separately as a reliable filler word for the 6-loss test
    VALID_GUESSES: ['crimp', 'flump', 'brisk', 'nacre', 'bland', 'stock', 'train'],
}));

describe('buildResultPayload', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0); // answer = 'crane'
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('records the correct word in the payload', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value?.word).toBe('crane');
    });

    it('counts green (correct) tiles across the guesses', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        // 'crimp' vs 'crane': c(correct) r(correct) i(absent) m(absent) p(absent) → 2 greens
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        // 'crane' vs 'crane': all correct → 5 greens. Total = 2+5 = 7
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value?.green_count).toBe(7);
    });

    it('counts yellow (present) tiles across the guesses', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        // 'nacre' vs 'crane': n→present a→present c→present r→present e→correct → 4 yellows
        ['n','a','c','r','e'].forEach(l => addLetter(l));
        submitGuess();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value?.yellow_count).toBe(4);
    });

    it('records elapsed time in seconds', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        addLetter('c'); // first letter starts the clock
        vi.advanceTimersByTime(15_000); // advance 15s
        ['r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value?.time_seconds).toBe(15);
    });

    it('records the submitted guesses in order', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value?.guesses).toEqual(['crimp', 'crane']);
    });

    it('calculates guess intervals as differences between consecutive submit times', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        addLetter('c'); // starts clock at T+0
        vi.advanceTimersByTime(10_000); // +10s
        ['r','i','m','p'].forEach(l => addLetter(l));
        submitGuess(); // first submit at T+10

        vi.advanceTimersByTime(5_000); // +5s
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess(); // second submit at T+15

        // intervals: [10, 5] (first is time from start, second is diff)
        expect(lastResult.value?.guess_intervals).toEqual([10, 5]);
    });

    it('aggregates letter frequency across all valid guesses', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        // 'crimp': c,r,i,m,p — c appears once
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        // 'crane': c,r,a,n,e — c appears once more
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value?.letter_frequency['c']).toBe(2);
        expect(lastResult.value?.letter_frequency['r']).toBe(2);
        expect(lastResult.value?.letter_frequency['i']).toBe(1);
    });

    it('sets attempts to the number of guesses made (win)', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value?.attempts).toBe(2);
    });

    it('sets attempts to 6 on a loss', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        const wrongWords = ['crimp', 'flump', 'brisk', 'train', 'bland', 'stock'];
        for (const word of wrongWords) {
            word.split('').forEach(l => addLetter(l));
            submitGuess();
        }
        expect(lastResult.value?.attempts).toBe(6);
        expect(lastResult.value?.won).toBe(false);
    });
});
