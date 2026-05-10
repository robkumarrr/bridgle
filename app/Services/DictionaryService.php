<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DictionaryService
{
    private const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';
    private const CACHE_PREFIX = 'dict:v1:';

    /**
     * Look up a word's definition.
     *
     * Cached forever — each unique word hits the external API exactly once,
     * ever, regardless of how many users play it.
     *
     * Returns a structured array or null if the word isn't in the dictionary.
     */
    public function define(string $word): ?array
    {
        $word = strtolower(trim($word));
        $cacheKey = self::CACHE_PREFIX . $word;

        // rememberForever: if it's in cache, return it. If not, fetch once and store it.
        return Cache::rememberForever($cacheKey, function () use ($word) {
            return $this->fetchFromApi($word);
        });
    }

    private function fetchFromApi(string $word): ?array
    {
        try {
            $response = Http::timeout(5)
                ->get(self::API_BASE . '/' . urlencode($word));

            if ($response->failed() || $response->status() === 404) {
                // Cache a null-equivalent so we don't keep retrying unknown words
                return null;
            }

            $data = $response->json();

            if (empty($data) || !is_array($data)) {
                return null;
            }

            return $this->parse($data);
        } catch (\Throwable $e) {
            // Don't cache on network error — let it retry next time
            Log::warning('DictionaryService: API fetch failed', [
                'word'  => $word,
                'error' => $e->getMessage(),
            ]);

            // Throw so Cache::rememberForever doesn't store the null from an error
            throw $e;
        }
    }

    /**
     * Parse the raw API response into a clean, lean shape.
     * We only keep what we'll actually display.
     */
    private function parse(array $data): array
    {
        $entry = $data[0];

        // Phonetic: prefer one that has audio, fall back to any text
        $phonetic = null;
        $audioUrl  = null;

        foreach ($entry['phonetics'] ?? [] as $p) {
            if (!empty($p['audio']) && empty($audioUrl)) {
                $audioUrl = $p['audio'];
            }
            if (!empty($p['text']) && empty($phonetic)) {
                $phonetic = $p['text'];
            }
        }

        // Pull up to 2 definitions per part-of-speech, max 3 parts of speech
        $meanings = [];
        foreach (array_slice($entry['meanings'] ?? [], 0, 3) as $meaning) {
            $defs = [];
            foreach (array_slice($meaning['definitions'] ?? [], 0, 2) as $def) {
                $defs[] = [
                    'definition' => $def['definition'],
                    'example'    => $def['example'] ?? null,
                ];
            }
            if ($defs) {
                $meanings[] = [
                    'part_of_speech' => $meaning['partOfSpeech'],
                    'definitions'    => $defs,
                ];
            }
        }

        return [
            'word'     => $entry['word'],
            'phonetic' => $phonetic,
            'audio'    => $audioUrl,
            'meanings' => $meanings,
        ];
    }
}
