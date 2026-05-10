<?php

namespace App\Http\Controllers;

use App\Services\DictionaryService;
use Illuminate\Http\JsonResponse;

class DictionaryController extends Controller
{
    public function __construct(private DictionaryService $dictionary) {}

    public function show(string $word): JsonResponse
    {
        // Sanitise: only allow 5-letter alpha words (our game's constraint)
        if (!preg_match('/^[a-z]{5}$/i', $word)) {
            return response()->json(['error' => 'Invalid word'], 422);
        }

        $definition = $this->dictionary->define(strtolower($word));

        if (!$definition) {
            return response()->json(['error' => 'Not found'], 404);
        }

        return response()->json($definition);
    }
}
