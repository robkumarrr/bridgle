<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class ActiveGameController extends Controller
{
    /**
     * Return the authenticated user's active game, or null if none exists.
     */
    public function show(): JsonResponse|\Illuminate\Http\Response
    {
        $game = Auth::user()->activeGame;

        if ($game === null) {
            // response()->json(null) in Laravel 13 serialises to '{}' — explicitly
            // return the JSON literal null so clients can distinguish "no game".
            return response('null', 200)->header('Content-Type', 'application/json');
        }

        return response()->json($game);
    }

    /**
     * Create or update the active game (upsert).
     * Called after every guess and when a new game is started.
     */
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'word'               => ['required', 'string', 'size:5'],
            'board'              => ['required', 'array'],
            'current_row'        => ['required', 'integer', 'min:0', 'max:6'],
            'game_state'         => ['required', 'string', 'in:playing,won,lost'],
            'letter_states'      => ['nullable', 'array'],
            'game_start_time'    => ['nullable', 'integer'],
            'guess_times'        => ['nullable', 'array'],
            'guesses'            => ['nullable', 'array'],
            'invalid_guess_count' => ['required', 'integer', 'min:0'],
            'letter_frequency'   => ['nullable', 'array'],
            'last_result'        => ['nullable', 'array'],
        ]);

        Auth::user()->activeGame()->updateOrCreate(
            ['user_id' => Auth::id()],
            $validated
        );

        return response()->noContent();
    }

    /**
     * Delete the active game so a new one can begin.
     */
    public function destroy(): Response
    {
        Auth::user()->activeGame()?->delete();

        return response()->noContent();
    }
}
