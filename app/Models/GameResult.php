<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameResult extends Model
{
    protected $fillable = [
        'user_id',
        'word',
        'won',
        'attempts',
        'green_count',
        'yellow_count',
        'time_seconds',
        'guess_times',
        'guess_intervals',
        'guesses',
        'invalid_guesses',
        'letter_frequency',
    ];

    protected $casts = [
        'won'              => 'boolean',
        'guess_times'      => 'array',
        'guess_intervals'  => 'array',
        'guesses'          => 'array',
        'letter_frequency' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
