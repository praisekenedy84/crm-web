<?php

namespace App\Models;

use App\Services\TenantContext;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class PublicHoliday extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'date',
        'region',
        'is_recurring_annually',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'is_recurring_annually' => 'boolean',
        ];
    }

    public function scopeIncludingPlatformDefaults(Builder $query): Builder
    {
        return $query->withoutGlobalScope('tenant')
            ->where(function (Builder $query): void {
                $tenantId = TenantContext::id();

                if ($tenantId) {
                    $query->where('tenant_id', $tenantId)
                        ->orWhereNull('tenant_id');
                } else {
                    $query->whereNull('tenant_id');
                }
            });
    }
}
