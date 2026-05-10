<?php

use App\Http\Controllers\DictionaryController;
use App\Http\Controllers\GameResultController;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Laravel\Fortify\Features;

Route::inertia('/', 'Welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

// Rate limiter: max 30 dictionary lookups per user per hour.
// Since results are cached forever, this only matters on cache misses (new words).
RateLimiter::for('dictionary', function (Request $request) {
    return \Illuminate\Cache\RateLimiting\Limit::perHour(30)
        ->by($request->user()?->id ?? $request->ip());
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');
    Route::post('game-results', [GameResultController::class, 'store'])->name('game-results.store');
    Route::get('stats', [GameResultController::class, 'stats'])->name('stats');
    Route::get('dictionary/{word}', [DictionaryController::class, 'show'])
        ->middleware('throttle:dictionary')
        ->name('dictionary.show');
});

require __DIR__.'/settings.php';
