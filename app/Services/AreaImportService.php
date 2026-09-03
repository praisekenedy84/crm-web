<?php

namespace App\Services;

use App\Enums\AreaLevel;
use App\Models\Area;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AreaImportService
{
    /**
     * @param  array<int, array<string, string|null>>  $records
     * @return array{created: int, rows_processed: int}
     */
    public function import(array $records): array
    {
        return DB::transaction(function () use ($records): array {
            $created = 0;

            foreach ($records as $index => $record) {
                $parent = null;
                $hasGap = false;

                foreach (AreaLevel::cases() as $level) {
                    $name = trim((string) ($record[$level->value] ?? ''));

                    if ($name === '') {
                        $hasGap = true;

                        continue;
                    }

                    if ($hasGap) {
                        throw ValidationException::withMessages([
                            "records.{$index}.{$level->value}" => [
                                ucfirst($level->value).' cannot be provided without its parent area.',
                            ],
                        ]);
                    }

                    $area = Area::firstOrCreate(
                        [
                            'name' => $name,
                            'level' => $level,
                            'parent_area_id' => $parent?->id,
                        ],
                        [
                            'is_custom' => false,
                            'created_by' => Auth::id(),
                        ],
                    );

                    if ($area->wasRecentlyCreated) {
                        $created++;
                        AuditService::log('created', $area, ['source' => 'csv_import']);
                    }

                    $parent = $area;
                }
            }

            return [
                'created' => $created,
                'rows_processed' => count($records),
            ];
        });
    }
}
