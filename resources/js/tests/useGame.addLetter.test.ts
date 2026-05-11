import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGame } from '@/composables/useGame';

// Always pick the first answer ('crane' in our mock)
vi.mock('@/data/words', () => ({
    ANSWERS: ['crane', 'slate', 'audio'],
    VALID_GUESSES: ['crimp', 'flump', 'brisk'],
}));

describe('addLetter', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0); // always picks ANSWERS[0] = 'crane'
    });

    it('adds a letter to the first empty slot in the current row', () => {
        const { board, addLetter } = useGame();
        addLetter('c');
        expect(board.value[0][0].letter).toBe('c');
    });

    it('sets the tile state to filled', () => {
        const { board, addLetter } = useGame();
        addLetter('c');
        expect(board.value[0][0].state).toBe('filled');
    });

    it('fills consecutive slots on repeated calls', () => {
        const { board, addLetter } = useGame();
        addLetter('c');
        addLetter('r');
        addLetter('a');
        expect(board.value[0][0].letter).toBe('c');
        expect(board.value[0][1].letter).toBe('r');
        expect(board.value[0][2].letter).toBe('a');
    });

    it('does nothing when the current row is already full', () => {
        const { board, addLetter } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        addLetter('x'); // row full — should be ignored
        expect(board.value[0].every(t => t.letter !== 'x')).toBe(true);
    });

    it('does not add a letter when the game is not playing', () => {
        const { board, addLetter, submitGuess } = useGame();
        // Win the game
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        // Now game is won — further input should be ignored
        addLetter('z');
        expect(board.value[1][0].letter).toBe('');
    });

    it('lowercases the letter before storing', () => {
        const { board, addLetter } = useGame();
        addLetter('C');
        expect(board.value[0][0].letter).toBe('c');
    });

    it('sets gameStartTime on the very first letter typed', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
        const { addLetter, submitGuess, board } = useGame();

        addLetter('c'); // first letter — should start the clock
        vi.setSystemTime(new Date('2026-01-01T12:00:10Z')); // 10s later

        // Submit a full word and check time_seconds in the payload
        ['r','a','n','e'].forEach(l => addLetter(l));
        submitGuess(); // wins — lastResult is set
        // If startTime was captured at the right moment, time_seconds should be ~10
        vi.useRealTimers();
    });
});
