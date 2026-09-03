<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Territory extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'name', 'rules'];

    protected function casts(): array
    {
        return ['rules' => 'array'];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}
