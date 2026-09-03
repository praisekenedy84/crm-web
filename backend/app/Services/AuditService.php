<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log(string $action, Model $model, ?array $changes = null): void
    {
        AuditLog::create([
            'tenant_id' => $model->tenant_id ?? TenantContext::id(),
            'user_id' => Auth::id(),
            'action' => $action,
            'object_type' => $model->getMorphClass(),
            'object_id' => $model->getKey(),
            'changes' => $changes,
            'created_at' => now(),
        ]);
    }
}
