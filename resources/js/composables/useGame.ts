import { ref, computed } from 'vue';
import { ANSWERS, VALID_GUESSES } from '@/data/words';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TileState = 'empty' | 'filled' | 'correct' | 'present' | 'absent';
export type GameState = 'playing' | 'won' | 'lost';

export interface Tile {
    letter: string;
    state: TileState;
}

export interface GameResultPayload {
    word: string;
    won: boolean;
    attempts: number;
    green_count: number;
    yellow_count: number;
    time_seconds: number | null;
    guess_times: number[];
    guesses: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

// All words accepted as valid guesses (answers + extra)
const ALL_VALID = new Set([...ANSWERS, ...VALID_GUESSES]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickRandom(): string {
    return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

/**
 * Score a guess against the answer.
 * Handles duplicate letters correctly — greens are locked first,
 * then yellows consume remaining unmatched letters in the answer.
 */
function scoreGuess(guess: string, answer: string): TileState[] {
    const result: TileState[] = Array(WORD_LENGTH).fill('absent');
    const answerPool = answer.split('');

    // Pass 1: mark greens and remove them from the pool
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === answer[i]) {
            result[i] = 'correct';
            answerPool[i] = ''; // consumed
        }
    }

    // Pass 2: mark yellows from remaining pool letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (result[i] === 'correct') continue;
        const idx = answerPool.indexOf(guess[i]);
        if (idx !== -1) {
            result[i] = 'present';
            answerPool[idx] = ''; // consume so it's not double-counted
        }
    }

    return result;
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useGame() {
    // The secret word for this round
    const answer = ref<string>(pickRandom());

    // 6 rows, each with 5 tiles
    const board = ref<Tile[][]>(
        Array.from({ length: MAX_GUESSES }, () =>
            Array.from({ length: WORD_LENGTH }, () => ({ letter: '', state: 'empty' as TileState }))
        )
    );

    // Which row the player is currently typing into
    const currentRow = ref<number>(0);

    // Overall game state
    const gameState = ref<GameState>('playing');

    // Best known state for each letter (used to color the keyboard)
    const letterStates = ref<Record<string, TileState>>({});

    // Toast / shake feedback message
    const message = ref<string>('');
    const shakingRow = ref<number | null>(null);

    // ── Timing & stat tracking ────────────────────────────────────────────────

    // Timestamp (ms) of the first letter typed this game
    const gameStartTime = ref<number | null>(null);
    // Timestamp of each guess submission (ms since game start)
    const guessTimes = ref<number[]>([]);
    // The actual guess words submitted
    const submittedGuesses = ref<string[]>([]);
    // The final result payload, set on win/lose
    const lastResult = ref<GameResultPayload | null>(null);

    // ── Derived ──────────────────────────────────────────────────────────────

    /** Letters typed so far in the current row */
    const currentGuess = computed<string>(() =>
        board.value[currentRow.value]?.map(t => t.letter).join('') ?? ''
    );

    const isPlaying = computed(() => gameState.value === 'playing');

    // ── Internal helpers ──────────────────────────────────────────────────────

    function showMessage(msg: string, duration = 1800) {
        message.value = msg;
        setTimeout(() => { message.value = ''; }, duration);
    }

    function shakeRow(row: number) {
        shakingRow.value = row;
        setTimeout(() => { shakingRow.value = null; }, 600);
    }

    function updateLetterStates(guess: string, states: TileState[]) {
        // Priority: correct > present > absent — never downgrade a letter's state
        const priority: Record<TileState, number> = { correct: 3, present: 2, absent: 1, filled: 0, empty: 0 };
        for (let i = 0; i < WORD_LENGTH; i++) {
            const letter = guess[i];
            const existing = letterStates.value[letter];
            if (!existing || priority[states[i]] > priority[existing]) {
                letterStates.value[letter] = states[i];
            }
        }
    }

    function buildResultPayload(won: boolean, attempts: number, allStates: TileState[][]): GameResultPayload {
        const now = Date.now();
        const timeSeconds = gameStartTime.value
            ? Math.round((now - gameStartTime.value) / 1000)
            : null;

        let greenCount = 0;
        let yellowCount = 0;
        for (const rowStates of allStates) {
            for (const s of rowStates) {
                if (s === 'correct') greenCount++;
                else if (s === 'present') yellowCount++;
            }
        }

        return {
            word: answer.value,
            won,
            attempts,
            green_count: greenCount,
            yellow_count: yellowCount,
            time_seconds: timeSeconds,
            guess_times: [...guessTimes.value],
            guesses: [...submittedGuesses.value],
        };
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    function addLetter(letter: string) {
        if (!isPlaying.value) return;
        // Start the clock on first letter typed
        if (gameStartTime.value === null) {
            gameStartTime.value = Date.now();
        }
        const row = board.value[currentRow.value];
        const emptyIdx = row.findIndex(t => t.letter === '');
        if (emptyIdx === -1) return; // row is full
        row[emptyIdx].letter = letter.toLowerCase();
        row[emptyIdx].state = 'filled';
    }

    function removeLetter() {
        if (!isPlaying.value) return;
        const row = board.value[currentRow.value];
        for (let i = WORD_LENGTH - 1; i >= 0; i--) {
            if (row[i].letter !== '') {
                row[i].letter = '';
                row[i].state = 'empty';
                break;
            }
        }
    }

    function submitGuess() {
        if (!isPlaying.value) return;

        const guess = currentGuess.value;

        if (guess.length < WORD_LENGTH) {
            showMessage('Not enough letters');
            shakeRow(currentRow.value);
            return;
        }

        if (!ALL_VALID.has(guess)) {
            showMessage('Not in word list');
            shakeRow(currentRow.value);
            return;
        }

        // Record guess time (seconds since game started)
        if (gameStartTime.value !== null) {
            guessTimes.value.push(Math.round((Date.now() - gameStartTime.value) / 1000));
        }
        submittedGuesses.value.push(guess);

        // Score the guess
        const states = scoreGuess(guess, answer.value);
        const row = board.value[currentRow.value];

        for (let i = 0; i < WORD_LENGTH; i++) {
            row[i].state = states[i];
        }

        updateLetterStates(guess, states);

        const attemptNumber = currentRow.value + 1;

        if (guess === answer.value) {
            gameState.value = 'won';
            const allStates = board.value.slice(0, attemptNumber).map(r => r.map(t => t.state));
            lastResult.value = buildResultPayload(true, attemptNumber, allStates);
            const msgs = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
            showMessage(msgs[currentRow.value] ?? 'Nice!', 3000);
        } else if (currentRow.value === MAX_GUESSES - 1) {
            gameState.value = 'lost';
            const allStates = board.value.map(r => r.map(t => t.state));
            lastResult.value = buildResultPayload(false, MAX_GUESSES, allStates);
            showMessage(answer.value.toUpperCase(), 5000);
        }

        currentRow.value++;
    }

    function newGame() {
        answer.value = pickRandom();
        board.value = Array.from({ length: MAX_GUESSES }, () =>
            Array.from({ length: WORD_LENGTH }, () => ({ letter: '', state: 'empty' as TileState }))
        );
        currentRow.value = 0;
        gameState.value = 'playing';
        letterStates.value = {};
        message.value = '';
        shakingRow.value = null;
        gameStartTime.value = null;
        guessTimes.value = [];
        submittedGuesses.value = [];
        lastResult.value = null;
    }

    return {
        // State
        board,
        currentRow,
        gameState,
        letterStates,
        message,
        shakingRow,
        lastResult,
        // Derived
        currentGuess,
        isPlaying,
        // Actions
        addLetter,
        removeLetter,
        submitGuess,
        newGame,
    };
}
