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
        'guesses',
    ];

    protected $casts = [
        'won'         => 'boolean',
        'guess_times' => 'array',
        'guesses'     => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
