<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'plan',
        'timezone',
        'default_currency',
        'enabled_modules',
    ];

    protected function casts(): array
    {
        return [
            'enabled_modules' => 'array',
        ];
    }

    public function hasModule(string $module): bool
    {
        return in_array($module, $this->enabled_modules ?? [], true);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
