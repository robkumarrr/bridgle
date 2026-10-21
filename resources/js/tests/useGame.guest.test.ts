import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGame, GUEST_STORAGE_KEY } from '@/composables/useGame';

vi.mock('@/data/words', () => ({
    ANSWERS: ['crane', 'slate', 'audio'],
    VALID_GUESSES: ['crimp', 'flump', 'brisk'],
}));

// In-memory Storage — Node 25's experimental global localStorage shadows
// jsdom's and has no methods, so we stub our own for a consistent env.
function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
        get length() { return data.size; },
        key: (i: number) => [...data.keys()][i] ?? null,
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => { data.set(k, String(v)); },
        removeItem: (k: string) => { data.delete(k); },
        clear: () => { data.clear(); },
    };
}

function stored() {
    return JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) ?? 'null');
}

function type(game: ReturnType<typeof useGame>, word: string) {
    for (const l of word) game.addLetter(l);
    game.submitGuess();
}

// ─── Guest mode — localStorage persistence, never touches the API ────────────

describe('useGame — guest mode', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.stubGlobal('localStorage', memoryStorage());
        vi.spyOn(Math, 'random').mockReturnValue(0); // deterministic pickRandom → 'crane'
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('starts a fresh game and saves it locally when nothing is stored', async () => {
        const game = useGame({ guest: true });
        await game.initGame();

        expect(game.initialising.value).toBe(false);
        expect(stored()?.word).toBe('crane');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('restores an in-progress game from localStorage', async () => {
        const first = useGame({ guest: true });
        await first.initGame();
        type(first, 'slate');

        const second = useGame({ guest: true });
        await second.initGame();

        expect(second.currentRow.value).toBe(1);
        expect(second.board.value[0].map(t => t.letter).join('')).toBe('slate');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('newGame replaces the stored game without hitting the API', async () => {
        const game = useGame({ guest: true });
        await game.initGame();
        type(game, 'slate');

        vi.spyOn(Math, 'random').mockReturnValue(0.5); // → 'slate'
        await game.newGame();

        expect(stored()?.word).toBe('slate');
        expect(stored()?.current_row).toBe(0);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('falls back to a playable game if stored data is corrupt', async () => {
        localStorage.setItem(GUEST_STORAGE_KEY, '{not json');

        const game = useGame({ guest: true });
        await game.initGame();

        expect(game.initialising.value).toBe(false);
        expect(game.isPlaying.value).toBe(true);
    });

    it('logged-in mode still persists via the API, not localStorage', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve(null) } as unknown as Response);

        const game = useGame();
        await game.initGame();

        expect(fetchMock).toHaveBeenCalledWith('/active-game', expect.anything());
        expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
    });
});
