<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Manager = 'manager';
    case Rep = 'rep';
    case Support = 'support';
    case ReadOnly = 'readonly';

    public function canManageUsers(): bool
    {
        return $this === self::Admin;
    }

    public function canManageAllRecords(): bool
    {
        return in_array($this, [self::Admin, self::Manager], true);
    }
}
