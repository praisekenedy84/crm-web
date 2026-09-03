<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    use BelongsToTenant;

    protected $fillable = ['tenant_id', 'name', 'subject', 'body'];
}
