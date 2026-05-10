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
    guess_times: number[];        // cumulative seconds from first letter at each submit
    guess_intervals: number[];    // seconds between each consecutive guess
    guesses: string[];            // actual words guessed in order
    invalid_guesses: number;      // times "not in word list" was shown
    letter_frequency: Record<string, number>; // {a:3, b:1, ...} across all valid guesses
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const ALL_VALID = new Set([...ANSWERS, ...VALID_GUESSES]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickRandom(): string {
    return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

function scoreGuess(guess: string, answer: string): TileState[] {
    const result: TileState[] = Array(WORD_LENGTH).fill('absent');
    const answerPool = answer.split('');

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === answer[i]) {
            result[i] = 'correct';
            answerPool[i] = '';
        }
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (result[i] === 'correct') continue;
        const idx = answerPool.indexOf(guess[i]);
        if (idx !== -1) {
            result[i] = 'present';
            answerPool[idx] = '';
        }
    }

    return result;
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useGame() {
    const answer = ref<string>(pickRandom());

    const board = ref<Tile[][]>(
        Array.from({ length: MAX_GUESSES }, () =>
            Array.from({ length: WORD_LENGTH }, () => ({ letter: '', state: 'empty' as TileState }))
        )
    );

    const currentRow = ref<number>(0);
    const gameState = ref<GameState>('playing');
    const letterStates = ref<Record<string, TileState>>({});
    // Increments on every newGame() — used as :key on GameBoard to trigger remount animation
    const boardKey = ref<number>(0);
    const message = ref<string>('');
    const shakingRow = ref<number | null>(null);

    // ── Stat tracking ─────────────────────────────────────────────────────────

    const gameStartTime = ref<number | null>(null);
    const guessTimes = ref<number[]>([]);         // cumulative seconds at each guess
    const submittedGuesses = ref<string[]>([]);
    const invalidGuessCount = ref<number>(0);     // "not in word list" hits
    const letterFrequency = ref<Record<string, number>>({}); // letters used across all guesses
    const lastResult = ref<GameResultPayload | null>(null);

    // ── Derived ───────────────────────────────────────────────────────────────

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
        const priority: Record<TileState, number> = { correct: 3, present: 2, absent: 1, filled: 0, empty: 0 };
        for (let i = 0; i < WORD_LENGTH; i++) {
            const letter = guess[i];
            const existing = letterStates.value[letter];
            if (!existing || priority[states[i]] > priority[existing]) {
                letterStates.value[letter] = states[i];
            }
        }
    }

    function trackLetterFrequency(guess: string) {
        for (const letter of guess) {
            letterFrequency.value[letter] = (letterFrequency.value[letter] ?? 0) + 1;
        }
    }

    function buildResultPayload(won: boolean, attempts: number, allStates: TileState[][]): GameResultPayload {
        const timeSeconds = gameStartTime.value
            ? Math.round((Date.now() - gameStartTime.value) / 1000)
            : null;

        // Derive intervals: time between each consecutive guess submission
        const intervals: number[] = guessTimes.value.map((t, i) =>
            i === 0 ? t : t - guessTimes.value[i - 1]
        );

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
            guess_intervals: intervals,
            guesses: [...submittedGuesses.value],
            invalid_guesses: invalidGuessCount.value,
            letter_frequency: { ...letterFrequency.value },
        };
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    function addLetter(letter: string) {
        if (!isPlaying.value) return;
        if (gameStartTime.value === null) {
            gameStartTime.value = Date.now();
        }
        const row = board.value[currentRow.value];
        const emptyIdx = row.findIndex(t => t.letter === '');
        if (emptyIdx === -1) return;
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
            invalidGuessCount.value++;
            showMessage('Not in word list');
            shakeRow(currentRow.value);
            return;
        }

        if (gameStartTime.value !== null) {
            guessTimes.value.push(Math.round((Date.now() - gameStartTime.value) / 1000));
        }
        submittedGuesses.value.push(guess);
        trackLetterFrequency(guess);

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
        invalidGuessCount.value = 0;
        letterFrequency.value = {};
        lastResult.value = null;
        boardKey.value++; // triggers GameBoard remount → raindrop animation
    }

    return {
        board,
        boardKey,
        currentRow,
        gameState,
        letterStates,
        message,
        shakingRow,
        lastResult,
        currentGuess,
        isPlaying,
        addLetter,
        removeLetter,
        submitGuess,
        newGame,
    };
}
