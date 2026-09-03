<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\LeadScoreRule;

class LeadScoringService
{
    public function scoreLead(Lead $lead): int
    {
        $rules = LeadScoreRule::where('is_active', true)->get();
        $score = 0;

        foreach ($rules as $rule) {
            $value = data_get($lead, $rule->field);

            if ($this->matches($value, $rule->operator, $rule->value)) {
                $score += $rule->points;
            }
        }

        $lead->update(['score' => $score]);

        return $score;
    }

    public function scoreAll(): int
    {
        $count = 0;
        Lead::chunk(100, function ($leads) use (&$count) {
            foreach ($leads as $lead) {
                $this->scoreLead($lead);
                $count++;
            }
        });

        return $count;
    }

    private function matches(mixed $actual, string $operator, ?string $expected): bool
    {
        return match ($operator) {
            'equals' => (string) $actual === (string) $expected,
            'not_equals' => (string) $actual !== (string) $expected,
            'contains' => str_contains(strtolower((string) $actual), strtolower((string) $expected)),
            'not_empty' => ! empty($actual),
            default => false,
        };
    }
}
