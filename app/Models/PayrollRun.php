<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'period',
        'status',
        'total_gross',
        'total_net',
        'processed_by',
        'processed_at',
        'ledger_entry_id',
    ];

    protected function casts(): array
    {
        return [
            'total_gross' => 'decimal:2',
            'total_net' => 'decimal:2',
            'processed_at' => 'datetime',
        ];
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function ledgerEntry(): BelongsTo
    {
        return $this->belongsTo(LedgerEntry::class);
    }
}
