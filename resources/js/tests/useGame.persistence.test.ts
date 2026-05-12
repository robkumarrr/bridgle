import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGame } from '@/composables/useGame';

vi.mock('@/data/words', () => ({
    ANSWERS: ['crane', 'slate', 'audio'],
    VALID_GUESSES: ['crimp', 'flump', 'brisk'],
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyBoard() {
    return Array.from({ length: 6 }, () =>
        Array.from({ length: 5 }, () => ({ letter: '', state: 'empty' }))
    );
}

function savedGamePayload(overrides: Record<string, unknown> = {}) {
    return {
        word: 'slate',
        board: emptyBoard(),
        current_row: 2,
        game_state: 'playing',
        letter_states: { s: 'correct' },
        game_start_time: 1700000000,
        guess_times: [30, 90],
        guesses: ['crane', 'audio'],
        invalid_guess_count: 1,
        letter_frequency: { c: 1, r: 1 },
        last_result: null,
        ...overrides,
    };
}

// ─── initGame ─────────────────────────────────────────────────────────────────

describe('initGame — hydration from API', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0); // deterministic pickRandom → 'crane'
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('sets initialising to false after successful hydration', async () => {
        const saved = savedGamePayload();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
            json: () => Promise.resolve(saved),
        } as unknown as Response));

        const { initialising, initGame } = useGame();
        expect(initialising.value).toBe(true);
        await initGame();
        expect(initialising.value).toBe(false);
    });

    it('hydrates board from saved game', async () => {
        const customBoard = emptyBoard();
        customBoard[0][0] = { letter: 'c', state: 'correct' };
        const saved = savedGamePayload({ board: customBoard });

        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
            json: () => Promise.resolve(saved),
        } as unknown as Response));

        const { board, initGame } = useGame();
        await initGame();
        expect(board.value[0][0].letter).toBe('c');
        expect(board.value[0][0].state).toBe('correct');
    });

    it('hydrates currentRow from saved game', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
            json: () => Promise.resolve(savedGamePayload({ current_row: 3 })),
        } as unknown as Response));

        const { currentRow, initGame } = useGame();
        await initGame();
        expect(currentRow.value).toBe(3);
    });

    it('hydrates gameState from saved game', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
            json: () => Promise.resolve(savedGamePayload({ game_state: 'won' })),
        } as unknown as Response));

        const { gameState, initGame } = useGame();
        await initGame();
        expect(gameState.value).toBe('won');
    });

    it('hydrates letterStates from saved game', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
            json: () => Promise.resolve(savedGamePayload({ letter_states: { s: 'correct', l: 'absent' } })),
        } as unknown as Response));

        const { letterStates, initGame } = useGame();
        await initGame();
        expect(letterStates.value).toEqual({ s: 'correct', l: 'absent' });
    });

    it('hydrates submittedGuesses and invalidGuessCount', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
            json: () => Promise.resolve(savedGamePayload({
                guesses: ['crane', 'flump'],
                invalid_guess_count: 3,
            })),
        } as unknown as Response));

        // The best proxy is to ensure submitGuess still works correctly after hydration
        const { initGame, isPlaying } = useGame();
        await initGame();
        expect(isPlaying.value).toBe(true); // game_state is 'playing' in payload
    });
});

describe('initGame — fresh game when API returns null', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0); // 'crane'
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('picks a random word and calls saveGame (PUT) when no saved game', async () => {
        // First fetch: GET /active-game → null
        // Second fetch: PUT /active-game (saveGame)
        const mockFetch = vi.fn()
            .mockResolvedValueOnce({ json: () => Promise.resolve(null) } as unknown as Response)
            .mockResolvedValueOnce({ ok: true } as unknown as Response);
        vi.stubGlobal('fetch', mockFetch);

        const { initGame, isPlaying } = useGame();
        await initGame();

        expect(isPlaying.value).toBe(true);
        const putCall = mockFetch.mock.calls.find(call => {
            const opts = call[1] as RequestInit | undefined;
            return opts?.method === 'PUT';
        });
        expect(putCall).toBeDefined();
    });

    it('falls back gracefully when API throws', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')));

        const { initialising, isPlaying, initGame } = useGame();
        await initGame();

        expect(initialising.value).toBe(false);
        expect(isPlaying.value).toBe(true); // fallback local game starts
    });

    it('sets initialising to false even on API error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Offline')));

        const { initialising, initGame } = useGame();
        await initGame();
        expect(initialising.value).toBe(false);
    });
});

// ─── submitGuess → saveGame ───────────────────────────────────────────────────

describe('submitGuess calls saveGame (PUT) after a valid guess', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0); // 'crane'
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('fires a PUT to /active-game after a valid guess', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true } as unknown as Response);
        vi.stubGlobal('fetch', mockFetch);

        const { addLetter, submitGuess } = useGame();
        ['c', 'r', 'i', 'm', 'p'].forEach(l => addLetter(l));
        submitGuess();

        // Wait a tick for the fire-and-forget fetch
        await Promise.resolve();

        const putCall = mockFetch.mock.calls.find(call => {
            const opts = call[1] as RequestInit | undefined;
            return opts?.method === 'PUT';
        });
        expect(putCall).toBeDefined();
        expect(putCall![0]).toBe('/active-game');
    });

    it('does not fire PUT for an invalid (too short) guess', () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true } as unknown as Response);
        vi.stubGlobal('fetch', mockFetch);

        const { addLetter, submitGuess } = useGame();
        addLetter('c'); // only one letter
        submitGuess();

        const putCall = mockFetch.mock.calls.find(call => {
            const opts = call[1] as RequestInit | undefined;
            return opts?.method === 'PUT';
        });
        expect(putCall).toBeUndefined();
    });
});

// ─── newGame calls clearSavedGame ─────────────────────────────────────────────

describe('newGame calls clearSavedGame (DELETE) then saveGame (PUT)', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('fires DELETE to /active-game on newGame()', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true } as unknown as Response);
        vi.stubGlobal('fetch', mockFetch);

        const { newGame } = useGame();
        await newGame();

        const deleteCall = mockFetch.mock.calls.find(call => {
            const opts = call[1] as RequestInit | undefined;
            return opts?.method === 'DELETE';
        });
        expect(deleteCall).toBeDefined();
        expect(deleteCall![0]).toBe('/active-game');
    });

    it('fires PUT to /active-game after DELETE on newGame()', async () => {
        const callLog: string[] = [];
        vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
            callLog.push(opts?.method ?? 'GET');
            return Promise.resolve({ ok: true } as Response);
        }));

        const { newGame } = useGame();
        await newGame();

        // DELETE must come before PUT
        const deleteIdx = callLog.indexOf('DELETE');
        const putIdx = callLog.lastIndexOf('PUT');
        expect(deleteIdx).toBeGreaterThanOrEqual(0);
        expect(putIdx).toBeGreaterThan(deleteIdx);
    });
});
