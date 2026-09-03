<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Deal extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'pipeline_id',
        'stage_id',
        'name',
        'account_id',
        'contact_id',
        'value',
        'currency',
        'owner_id',
        'expected_close_date',
        'probability',
        'status',
        'win_loss_reason',
        'closed_at',
        'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'expected_close_date' => 'date',
            'closed_at' => 'datetime',
            'custom_fields' => 'array',
        ];
    }

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'stage_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function stageHistory(): HasMany
    {
        return $this->hasMany(DealStageHistory::class)->orderByDesc('changed_at');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(DealLineItem::class)->orderBy('sort_order')->orderBy('id');
    }

    public function salesOrders(): HasMany
    {
        return $this->hasMany(SalesOrder::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function getWeightedValueAttribute(): float
    {
        $probability = $this->probability ?? $this->stage?->probability ?? 0;

        return (float) $this->value * ($probability / 100);
    }
}
