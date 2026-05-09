# Bridgle — Task Tracker

## Phase 1 — The Game UI
- [ ] Set up a static 5-letter word list (client-side, for now)
- [ ] Build the game board (6 rows × 5 letter tiles)
- [ ] Build the on-screen keyboard
- [ ] Implement guess input (keyboard + physical keyboard support)
- [ ] Implement color logic (green / yellow / gray)
- [ ] Win / loss detection + end-game state
- [ ] Basic animations (tile flip, invalid word shake)

## Phase 2 — Server-Side Words
- [ ] Move word list to backend (so the answer is never exposed in the client)
- [ ] Laravel endpoint: start a new game (picks a word, stores in session)
- [ ] Laravel endpoint: submit a guess (returns color results only)
- [ ] Hook the Vue game up to the new API

## Phase 3 — Stats Tracking
- [ ] Migration: `games` table (user_id, word, guesses_used, green_count, yellow_count, completed_at, duration_seconds)
- [ ] Migration: `guesses` table (game_id, guess, time_since_last_guess)
- [ ] Record game on completion
- [ ] Stats page on the dashboard (wins, avg guesses, avg time, green/yellow totals)

## Phase 4 — Polish + Deploy
- [ ] Style the app to feel like Bridgle (not just a Wordle clone)
- [ ] Mobile responsiveness
- [ ] Finalize Docker setup for prod
- [ ] Deploy to DigitalOcean droplet
- [ ] Point domain (if any)

---
> One phase at a time. Don't skip ahead.
