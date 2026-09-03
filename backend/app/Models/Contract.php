<?php

namespace App\Models;

use App\Enums\ContractStatus;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contract extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'customer_party_id',
        'service_id',
        'contact_id',
        'amount_paid',
        'currency',
        'start_date',
        'end_date',
        'status',
        'contract_file_url',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount_paid' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'status' => ContractStatus::class,
        ];
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class, 'customer_party_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
