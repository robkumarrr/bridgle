import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGame } from '@/composables/useGame';

vi.mock('@/data/words', () => ({
    ANSWERS: ['crane', 'slate', 'audio'],
    VALID_GUESSES: ['crimp', 'flump', 'brisk'],
}));

describe('newGame', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
    });

    it('resets gameState to playing', () => {
        const { gameState, addLetter, submitGuess, newGame } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(gameState.value).toBe('won');
        newGame();
        expect(gameState.value).toBe('playing');
    });

    it('resets currentRow to 0', () => {
        const { currentRow, addLetter, submitGuess, newGame } = useGame();
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(currentRow.value).toBe(1);
        newGame();
        expect(currentRow.value).toBe(0);
    });

    it('clears all tiles on the board', () => {
        const { board, addLetter, submitGuess, newGame } = useGame();
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        newGame();
        const allEmpty = board.value.every(row =>
            row.every(tile => tile.letter === '' && tile.state === 'empty')
        );
        expect(allEmpty).toBe(true);
    });

    it('clears letterStates', () => {
        const { letterStates, addLetter, submitGuess, newGame } = useGame();
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(Object.keys(letterStates.value).length).toBeGreaterThan(0);
        newGame();
        expect(Object.keys(letterStates.value).length).toBe(0);
    });

    it('clears lastResult', () => {
        const { lastResult, addLetter, submitGuess, newGame } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value).not.toBeNull();
        newGame();
        expect(lastResult.value).toBeNull();
    });

    it('clears the message', () => {
        const { message, addLetter, submitGuess, newGame } = useGame();
        addLetter('c'); // incomplete guess to trigger message
        submitGuess();
        expect(message.value).toBe('Not enough letters');
        newGame();
        expect(message.value).toBe('');
    });

    it('increments boardKey on each call', () => {
        const { boardKey, newGame } = useGame();
        const initial = boardKey.value;
        newGame();
        expect(boardKey.value).toBe(initial + 1);
        newGame();
        expect(boardKey.value).toBe(initial + 2);
    });

    it('allows a new game to be played immediately after reset', () => {
        const { gameState, addLetter, submitGuess, newGame } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        newGame();
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(gameState.value).toBe('playing'); // wrong guess, still playing
    });
});
