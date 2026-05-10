<?php

use App\Http\Controllers\GameResultController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'Welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');
    Route::post('game-results', [GameResultController::class, 'store'])->name('game-results.store');
    Route::get('stats', [GameResultController::class, 'stats'])->name('stats');
});

require __DIR__.'/settings.php';
