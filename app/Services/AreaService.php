<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Area;
use App\Models\Contact;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AreaService
{
    public function mergeStreets(int $sourceId, int $targetId): Area
    {
        if ($sourceId === $targetId) {
            throw new InvalidArgumentException('Source and target areas must be different.');
        }

        return DB::transaction(function () use ($sourceId, $targetId) {
            $source = Area::query()->findOrFail($sourceId);
            $target = Area::query()->findOrFail($targetId);

            Contact::query()
                ->where('area_id', $source->id)
                ->update(['area_id' => $target->id]);

            Activity::query()
                ->where('area_id', $source->id)
                ->update(['area_id' => $target->id]);

            AuditService::log('area.merged', $target, [
                'source_area_id' => $source->id,
                'source_area_name' => $source->name,
            ]);

            $source->delete();

            return $target->fresh();
        });
    }
}
