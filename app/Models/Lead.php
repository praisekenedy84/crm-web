<?php

namespace App\Models;

use App\Enums\LeadStatus;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lead extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'source',
        'campaign',
        'status',
        'score',
        'owner_id',
        'converted_at',
        'converted_contact_id',
        'converted_account_id',
        'converted_deal_id',
        'custom_fields',
    ];

    protected function casts(): array
    {
        return [
            'status' => LeadStatus::class,
            'converted_at' => 'datetime',
            'custom_fields' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function convertedContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'converted_contact_id');
    }

    public function convertedAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'converted_account_id');
    }

    public function convertedDeal(): BelongsTo
    {
        return $this->belongsTo(Deal::class, 'converted_deal_id');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function isConverted(): bool
    {
        return $this->status === LeadStatus::Converted;
    }
}
