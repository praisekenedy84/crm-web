<?php

namespace App\Models;

use App\Enums\AreaLevel;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'level',
        'parent_area_id',
        'is_custom',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'level' => AreaLevel::class,
            'is_custom' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'parent_area_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Area::class, 'parent_area_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }
}
