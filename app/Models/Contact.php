<?php

namespace App\Models;

use App\Enums\ContactStatus;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'party_id',
        'account_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'title',
        'status',
        'owner_id',
        'area_id',
        'tags',
        'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'status' => ContactStatus::class,
            'tags' => 'array',
            'custom_fields' => 'array',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(Deal::class);
    }

    public function sourcedLeads(): HasMany
    {
        return $this->hasMany(Lead::class, 'source_contact_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(ContactStatusHistory::class)->orderByDesc('changed_at');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
