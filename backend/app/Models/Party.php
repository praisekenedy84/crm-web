<?php

namespace App\Models;

use App\Enums\PartyType;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Party extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'type',
        'name',
        'email',
        'phone',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'type' => PartyType::class,
            'metadata' => 'array',
        ];
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class, 'customer_party_id');
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class, 'employee_party_id');
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class, 'employee_party_id');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
