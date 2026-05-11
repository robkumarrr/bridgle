import { describe, it, expect } from 'vitest';
import { scoreGuess } from '@/composables/useGame';

describe('scoreGuess', () => {
    it('marks all letters correct when guess equals answer', () => {
        expect(scoreGuess('crane', 'crane')).toEqual([
            'correct', 'correct', 'correct', 'correct', 'correct',
        ]);
    });

    it('marks all letters absent when nothing matches', () => {
        expect(scoreGuess('zzzzz', 'crane')).toEqual([
            'absent', 'absent', 'absent', 'absent', 'absent',
        ]);
    });

    it('marks a letter present when it exists but in the wrong position', () => {
        // 'c' is in 'crane' but not at index 4
        const result = scoreGuess('xxxxc', 'crane');
        expect(result[4]).toBe('present');
        expect(result[0]).toBe('absent');
    });

    it('marks a letter correct when it is in the right position', () => {
        // 'c' at index 0 matches 'crane'
        const result = scoreGuess('cxxxx', 'crane');
        expect(result[0]).toBe('correct');
    });

    it('handles duplicate letters in guess when answer has only one — two-pass rule', () => {
        // answer: 'crane' has one 'r'
        // guess:  'rrrxx' — first 'r' is present (wrong pos), second 'r' is correct (pos 2 in crane? no)
        // actually 'r' is at index 1 in 'crane'
        // guess 'rxxxr': first r at 0 → present (r is at 1), second r at 4 → absent (pool exhausted)
        const result = scoreGuess('rxxxr', 'crane');
        expect(result[0]).toBe('present'); // r exists but not at 0
        expect(result[4]).toBe('absent');  // pool has no more r's
    });

    it('does not double-count: correct green consumes the letter from the pool', () => {
        // answer: 'abbey' — two b's
        // guess:  'abbbb' — a(correct) b(correct) b(correct) b(absent) b(absent)
        const result = scoreGuess('abbbb', 'abbey');
        expect(result[0]).toBe('correct'); // a
        expect(result[1]).toBe('correct'); // b at index 1
        expect(result[2]).toBe('correct'); // b at index 2
        expect(result[3]).toBe('absent');  // no more b's in pool
        expect(result[4]).toBe('absent');  // no more b's in pool
    });

    it('marks present correctly when answer has two of a letter and guess has one', () => {
        // answer: 'tummy' — two m's at index 2,3
        // guess:  'xmxxx' — m at index 1, not at 2 or 3 → present
        const result = scoreGuess('xmxxx', 'tummy');
        expect(result[1]).toBe('present');
    });

    it('handles mixed correct, present, and absent in one guess', () => {
        // answer: 'table' — t(0)a(1)b(2)l(3)e(4)
        // guess:  'crane' — c(0)r(1)a(2)n(3)e(4)
        // c: not in 'table' → absent
        // r: not in 'table' → absent
        // a: 'table' has 'a' at index 1, guess has 'a' at index 2 → present
        // n: not in 'table' → absent
        // e: both have 'e' at index 4 → correct
        const result = scoreGuess('crane', 'table');
        expect(result[0]).toBe('absent');  // c not in table
        expect(result[1]).toBe('absent');  // r not in table
        expect(result[2]).toBe('present'); // a in table but at index 1, not 2
        expect(result[3]).toBe('absent');  // n not in table
        expect(result[4]).toBe('correct'); // e at index 4 in both
    });

    it('greens take priority over yellows for the same letter', () => {
        // answer: 'babes' — b at 0 and 2
        // guess:  'bbxxx' — b(0) correct, b(1) absent (pool has one b left at index 2 but guess[1] != answer[1])
        // Wait, let me reconsider: answer 'babes': b(0),a(1),b(2),e(3),s(4)
        // guess 'bbxxx': b(0)==b(0) → correct, b(1)!=a(1) → check pool: pool after greens = ['',a,'',e,s] wait no
        // After green pass: result[0]=correct, pool[0]=''. pool = ['', 'a', 'b', 'e', 's']
        // Yellow pass: guess[1]='b', result[1]!=correct, pool has 'b' at index 2 → present
        const result = scoreGuess('bbxxx', 'babes');
        expect(result[0]).toBe('correct'); // b at 0 is correct
        expect(result[1]).toBe('present'); // b exists at index 2 in pool
        expect(result[2]).toBe('absent');  // x not in babes
    });
});
