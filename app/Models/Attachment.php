<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Attachment extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'related_type',
        'related_id',
        'file_path',
        'file_name',
        'file_size',
        'uploaded_by',
    ];

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function related(): MorphTo
    {
        return $this->morphTo();
    }
}
