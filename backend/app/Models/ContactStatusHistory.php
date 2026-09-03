<?php

namespace App\Models;

use App\Enums\ContactStatus;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactStatusHistory extends Model
{
    use BelongsToTenant;

    public $timestamps = false;

    protected $table = 'contact_status_history';

    protected $fillable = [
        'tenant_id',
        'contact_id',
        'from_status',
        'to_status',
        'notes',
        'changed_by',
        'changed_at',
    ];

    protected function casts(): array
    {
        return [
            'from_status' => ContactStatus::class,
            'to_status' => ContactStatus::class,
            'changed_at' => 'datetime',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
