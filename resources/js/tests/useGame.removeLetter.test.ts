import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGame } from '@/composables/useGame';

vi.mock('@/data/words', () => ({
    ANSWERS: ['crane', 'slate', 'audio'],
    VALID_GUESSES: ['crimp', 'flump', 'brisk'],
}));

describe('removeLetter', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
    });

    it('removes the last filled letter in the current row', () => {
        const { board, addLetter, removeLetter } = useGame();
        addLetter('c');
        addLetter('r');
        removeLetter();
        expect(board.value[0][1].letter).toBe('');
        expect(board.value[0][0].letter).toBe('c'); // first letter untouched
    });

    it('sets the cleared tile state back to empty', () => {
        const { board, addLetter, removeLetter } = useGame();
        addLetter('c');
        removeLetter();
        expect(board.value[0][0].state).toBe('empty');
    });

    it('does nothing when the current row is already empty', () => {
        const { board, removeLetter } = useGame();
        removeLetter(); // nothing to remove
        expect(board.value[0].every(t => t.letter === '')).toBe(true);
    });

    it('removes letters one at a time from the end', () => {
        const { board, addLetter, removeLetter } = useGame();
        addLetter('c');
        addLetter('r');
        addLetter('a');
        removeLetter();
        expect(board.value[0][2].letter).toBe('');
        expect(board.value[0][1].letter).toBe('r');
        removeLetter();
        expect(board.value[0][1].letter).toBe('');
        expect(board.value[0][0].letter).toBe('c');
    });

    it('does not remove when game is not playing', () => {
        const { board, addLetter, removeLetter, submitGuess } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess(); // game won
        removeLetter(); // should be ignored
        // Row 0 tiles should still be in their scored states (not cleared)
        expect(board.value[0][4].letter).toBe('e');
    });
});
