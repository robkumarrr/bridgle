<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActiveGame extends Model
{
    protected $fillable = [
        'user_id',
        'word',
        'board',
        'current_row',
        'game_state',
        'letter_states',
        'game_start_time',
        'guess_times',
        'guesses',
        'invalid_guess_count',
        'letter_frequency',
        'last_result',
    ];

    protected $casts = [
        'board'            => 'array',
        'letter_states'    => 'array',
        'guess_times'      => 'array',
        'guesses'          => 'array',
        'letter_frequency' => 'array',
        'last_result'      => 'array',
        'game_start_time'  => 'integer',
        'current_row'      => 'integer',
        'invalid_guess_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
