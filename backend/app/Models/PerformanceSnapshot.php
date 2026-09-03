<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceSnapshot extends Model
{
    use BelongsToTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'employee_party_id',
        'period_start',
        'period_end',
        'metrics',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'metrics' => 'array',
            'generated_at' => 'datetime',
        ];
    }

    public function employeeParty(): BelongsTo
    {
        return $this->belongsTo(Party::class, 'employee_party_id');
    }
}
