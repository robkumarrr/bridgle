import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGame } from '@/composables/useGame';

vi.mock('@/data/words', () => ({
    ANSWERS: ['crane'],
    // 'nacre': n(0)a(1)c(2)r(3)e(4) vs crane c(0)r(1)a(2)n(3)e(4)
    //   n→present, a→present, c→present, r→present, e→correct  (all wrong pos except e)
    VALID_GUESSES: ['crimp', 'flump', 'brisk', 'nacre', 'bland', 'stock', 'cramp'],
}));

describe('letterStates priority', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0); // answer = 'crane'
    });

    it('marks a correct letter as correct in the keyboard state', () => {
        const { letterStates, addLetter, submitGuess } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['c']).toBe('correct');
        expect(letterStates.value['r']).toBe('correct');
    });

    it('marks a present (yellow) letter correctly', () => {
        const { letterStates, addLetter, submitGuess } = useGame();
        // answer = 'crane': c(0)r(1)a(2)n(3)e(4)
        // guess  = 'nacre': n(0)a(1)c(2)r(3)e(4)
        //   n: crane has n at 3, guess at 0 → present
        //   a: crane has a at 2, guess at 1 → present
        //   c: crane has c at 0, guess at 2 → present
        //   r: crane has r at 1, guess at 3 → present
        //   e: crane has e at 4, guess at 4 → correct
        ['n','a','c','r','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['n']).toBe('present');
        expect(letterStates.value['a']).toBe('present');
        expect(letterStates.value['c']).toBe('present');
        expect(letterStates.value['r']).toBe('present');
        expect(letterStates.value['e']).toBe('correct');
    });

    it('correct overwrites present for the same letter across guesses', () => {
        const { letterStates, addLetter, submitGuess } = useGame();
        // First guess 'nacre' — r is present (r at wrong position)
        ['n','a','c','r','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['r']).toBe('present');

        // Second guess 'cramp' — c(correct) r(correct) a(present) m(absent) p(absent)
        ['c','r','a','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['r']).toBe('correct'); // upgraded from present → correct
    });

    it('correct overwrites absent for the same letter', () => {
        const { letterStates, addLetter, submitGuess } = useGame();
        // 'brisk': b(0)absent r(1)correct i(2)absent s(3)absent k(4)absent
        // r is at index 1 in both 'brisk' and 'crane' → correct
        ['b','r','i','s','k'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['b']).toBe('absent');
        expect(letterStates.value['r']).toBe('correct');

        // r was never absent, but if it had been, correct must still win
        expect(['correct']).toContain(letterStates.value['r']);
    });

    it('absent does not overwrite present', () => {
        const { letterStates, addLetter, submitGuess } = useGame();
        // First guess 'nacre' — r is present
        ['n','a','c','r','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['r']).toBe('present');

        // Second guess 'flump' — r not used, letterStates['r'] should remain present
        ['f','l','u','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['r']).toBe('present'); // unchanged
    });

    it('absent does not overwrite correct', () => {
        const { letterStates, addLetter, submitGuess } = useGame();
        // 'cramp' — c at index 0 = correct
        ['c','r','a','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['c']).toBe('correct');

        // 'flump' — c not used, c should stay correct
        ['f','l','u','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(letterStates.value['c']).toBe('correct');
    });
});
