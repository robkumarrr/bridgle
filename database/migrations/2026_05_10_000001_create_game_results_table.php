<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('word', 5);           // the answer word
            $table->boolean('won');               // true = guessed correctly
            $table->unsignedTinyInteger('attempts'); // 1–6 (or 6 on loss)

            // Aggregate tile counts across all guesses in this game
            $table->unsignedSmallInteger('green_count')->default(0);  // correct position
            $table->unsignedSmallInteger('yellow_count')->default(0); // wrong position

            // Timing
            $table->unsignedInteger('time_seconds')->nullable(); // first letter → game end
            $table->json('guess_times')->nullable();             // seconds elapsed at each guess submission

            // The actual guesses made (for replay / analysis later)
            $table->json('guesses')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_results');
    }
};
