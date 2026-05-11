import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGame } from '@/composables/useGame';

vi.mock('@/data/words', () => ({
    ANSWERS: ['crane', 'slate', 'audio'],
    VALID_GUESSES: ['crimp', 'flump', 'brisk', 'train', 'bland', 'stock'],
}));

describe('submitGuess', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0); // answer = 'crane'
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows a message and shakes the row when the guess is too short', () => {
        const { message, shakingRow, addLetter, submitGuess } = useGame();
        addLetter('c');
        addLetter('r');
        submitGuess();
        expect(message.value).toBe('Not enough letters');
        expect(shakingRow.value).toBe(0);
    });

    it('does not advance the row when the guess is too short', () => {
        const { currentRow, addLetter, submitGuess } = useGame();
        addLetter('c');
        submitGuess();
        expect(currentRow.value).toBe(0);
    });

    it('shows a message and increments invalidGuessCount for a word not in the list', () => {
        const { message, addLetter, submitGuess } = useGame();
        // 'zzzzz' is not in ANSWERS or VALID_GUESSES
        ['z','z','z','z','z'].forEach(l => addLetter(l));
        submitGuess();
        expect(message.value).toBe('Not in word list');
    });

    it('does not advance the row for an invalid word', () => {
        const { currentRow, addLetter, submitGuess } = useGame();
        ['z','z','z','z','z'].forEach(l => addLetter(l));
        submitGuess();
        expect(currentRow.value).toBe(0);
    });

    it('sets gameState to won when the correct word is guessed', () => {
        const { gameState, addLetter, submitGuess } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(gameState.value).toBe('won');
    });

    it('populates lastResult on a win', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess();
        expect(lastResult.value).not.toBeNull();
        expect(lastResult.value?.won).toBe(true);
        expect(lastResult.value?.word).toBe('crane');
        expect(lastResult.value?.attempts).toBe(1);
    });

    it('advances currentRow after a valid wrong guess', () => {
        const { currentRow, addLetter, submitGuess } = useGame();
        ['c','r','i','m','p'].forEach(l => addLetter(l)); // valid but wrong
        submitGuess();
        expect(currentRow.value).toBe(1);
    });

    it('sets correct tile states on the board after a valid guess', () => {
        const { board, addLetter, submitGuess } = useGame();
        // answer = 'crane', guess = 'crimp'
        // c=correct r=correct i=absent m=absent p=absent
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(board.value[0][0].state).toBe('correct'); // c
        expect(board.value[0][1].state).toBe('correct'); // r
        expect(board.value[0][2].state).toBe('absent');  // i
        expect(board.value[0][3].state).toBe('absent');  // m
        expect(board.value[0][4].state).toBe('absent');  // p
    });

    it('sets gameState to lost after 6 wrong guesses', () => {
        const { gameState, addLetter, submitGuess } = useGame();
        const wrongWords = ['crimp', 'flump', 'brisk', 'train', 'bland', 'stock'];
        for (const word of wrongWords) {
            word.split('').forEach(l => addLetter(l));
            submitGuess();
        }
        expect(gameState.value).toBe('lost');
    });

    it('populates lastResult on a loss', () => {
        const { lastResult, addLetter, submitGuess } = useGame();
        const wrongWords = ['crimp', 'flump', 'brisk', 'train', 'bland', 'stock'];
        for (const word of wrongWords) {
            word.split('').forEach(l => addLetter(l));
            submitGuess();
        }
        expect(lastResult.value?.won).toBe(false);
        expect(lastResult.value?.word).toBe('crane');
    });

    it('ignores input when game is not playing', () => {
        const { gameState, addLetter, submitGuess, currentRow } = useGame();
        ['c','r','a','n','e'].forEach(l => addLetter(l));
        submitGuess(); // win
        const rowAfterWin = currentRow.value;
        ['c','r','i','m','p'].forEach(l => addLetter(l));
        submitGuess();
        expect(currentRow.value).toBe(rowAfterWin); // no change
        expect(gameState.value).toBe('won');
    });
});
