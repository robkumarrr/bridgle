<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('active_games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->char('word', 5);
            $table->json('board');
            $table->unsignedTinyInteger('current_row')->default(0);
            $table->string('game_state', 10)->default('playing');
            $table->json('letter_states')->nullable();
            $table->unsignedBigInteger('game_start_time')->nullable(); // unix ms
            $table->json('guess_times')->nullable();
            $table->json('guesses')->nullable();
            $table->unsignedInteger('invalid_guess_count')->default(0);
            $table->json('letter_frequency')->nullable();
            $table->json('last_result')->nullable(); // cached for modal on refresh
            $table->timestamps();

            $table->unique('user_id'); // one active game per user
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('active_games');
    }
};
