<?php

namespace App\Enums;

enum BillingCycle: string
{
    case OneTime = 'one_time';
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case Annual = 'annual';
}
