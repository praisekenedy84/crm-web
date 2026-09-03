<?php

namespace App\Enums;

enum ContractStatus: string
{
    case Active = 'active';
    case Expired = 'expired';
    case Cancelled = 'cancelled';
    case PendingRenewal = 'pending_renewal';
}
