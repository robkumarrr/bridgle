<?php

use App\Http\Controllers\ActiveGameController;
use App\Http\Controllers\DictionaryController;
use App\Http\Controllers\GameResultController;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

// The front page is the game. Guests play straight away (nothing is saved
// server-side, the game lives in localStorage); logged-in users get bounced
// to their dashboard.
Route::inertia('/', 'Dashboard', ['guest' => true])
    ->middleware('guest')
    ->name('home');

// Old guest-mode link, kept so shared /play links still work.
Route::permanentRedirect('play', '/')->name('play');

// Rate limiter: max 30 dictionary lookups per user per hour.
// Since results are cached forever, this only matters on cache misses (new words).
RateLimiter::for('dictionary', function (Request $request) {
    return \Illuminate\Cache\RateLimiting\Limit::perHour(30)
        ->by($request->user()?->id ?? $request->ip());
});

// Public so guests get definitions too — throttled per IP when there's no user.
Route::get('dictionary/{word}', [DictionaryController::class, 'show'])
    ->middleware('throttle:dictionary')
    ->name('dictionary.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');
    Route::post('game-results', [GameResultController::class, 'store'])->name('game-results.store');
    Route::get('stats', [GameResultController::class, 'stats'])->name('stats');

    // Active game persistence
    Route::get('active-game', [ActiveGameController::class, 'show'])->name('active-game.show');
    Route::put('active-game', [ActiveGameController::class, 'store'])->name('active-game.store');
    Route::delete('active-game', [ActiveGameController::class, 'destroy'])->name('active-game.destroy');
});

require __DIR__.'/settings.php';
