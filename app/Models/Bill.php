<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bill extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'vendor_party_id',
        'bill_number',
        'status',
        'total_amount',
        'currency',
        'issue_date',
        'due_date',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'issue_date' => 'date',
            'due_date' => 'date',
        ];
    }

    public function vendorParty(): BelongsTo
    {
        return $this->belongsTo(Party::class, 'vendor_party_id');
    }
}
