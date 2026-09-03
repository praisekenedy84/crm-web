<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingContentItem extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'title',
        'brief',
        'content_type',
        'platforms',
        'proposed_date',
        'scheduled_at',
        'status',
        'submitted_by',
        'assigned_to',
    ];

    protected function casts(): array
    {
        return [
            'platforms' => 'array',
            'proposed_date' => 'date',
            'scheduled_at' => 'datetime',
        ];
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
