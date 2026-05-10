<?php

namespace App\Http\Controllers;

use App\Models\GameResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class GameResultController extends Controller
{
    /**
     * Store a game result when a round finishes (win or loss).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'word'         => ['required', 'string', 'size:5'],
            'won'          => ['required', 'boolean'],
            'attempts'     => ['required', 'integer', 'min:1', 'max:6'],
            'green_count'  => ['required', 'integer', 'min:0'],
            'yellow_count' => ['required', 'integer', 'min:0'],
            'time_seconds' => ['nullable', 'integer', 'min:0'],
            'guess_times'  => ['nullable', 'array'],
            'guesses'      => ['nullable', 'array'],
        ]);

        Auth::user()->gameResults()->create($validated);

        return back();
    }

    /**
     * Return the authenticated user's stats for the stats modal.
     */
    public function stats()
    {
        $user = Auth::user();

        $results = $user->gameResults()
            ->latest()
            ->get(['won', 'attempts', 'green_count', 'yellow_count', 'time_seconds', 'created_at']);

        $total  = $results->count();
        $wins   = $results->where('won', true)->count();
        $losses = $total - $wins;

        // Guess distribution (only wins count — losses don't have a valid attempt number to chart)
        $distribution = array_fill(1, 6, 0);
        foreach ($results->where('won', true) as $r) {
            $distribution[$r->attempts] = ($distribution[$r->attempts] ?? 0) + 1;
        }

        // Current streak (consecutive wins from most recent)
        $streak = 0;
        foreach ($results as $r) {
            if ($r->won) {
                $streak++;
            } else {
                break;
            }
        }

        // Best streak
        $bestStreak = 0;
        $current    = 0;
        foreach ($results->reverse() as $r) {
            if ($r->won) {
                $current++;
                $bestStreak = max($bestStreak, $current);
            } else {
                $current = 0;
            }
        }

        $avgAttempts = $wins > 0
            ? round($results->where('won', true)->avg('attempts'), 1)
            : null;

        $avgTime = $results->whereNotNull('time_seconds')->avg('time_seconds');

        return response()->json([
            'total'        => $total,
            'wins'         => $wins,
            'losses'       => $losses,
            'win_rate'     => $total > 0 ? round($wins / $total * 100) : 0,
            'streak'       => $streak,
            'best_streak'  => $bestStreak,
            'avg_attempts' => $avgAttempts,
            'avg_time'     => $avgTime ? round($avgTime) : null,
            'distribution' => $distribution,
        ]);
    }
}
