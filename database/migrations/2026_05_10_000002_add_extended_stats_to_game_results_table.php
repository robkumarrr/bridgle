<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_results', function (Blueprint $table) {
            // Time between each consecutive guess (derived from guess_times, stored for easy querying)
            $table->json('guess_intervals')->nullable()->after('guess_times');
            // How many times the player typed a word not in the word list this game
            $table->unsignedSmallInteger('invalid_guesses')->default(0)->after('guess_intervals');
            // Letter usage frequency {a:3, b:1, ...} aggregated across all guesses this game
            $table->json('letter_frequency')->nullable()->after('invalid_guesses');
        });
    }

    public function down(): void
    {
        Schema::table('game_results', function (Blueprint $table) {
            $table->dropColumn(['guess_intervals', 'invalid_guesses', 'letter_frequency']);
        });
    }
};
