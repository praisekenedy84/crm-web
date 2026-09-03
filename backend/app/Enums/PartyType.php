<?php

namespace App\Enums;

enum PartyType: string
{
    case Customer = 'customer';
    case Vendor = 'vendor';
    case Employee = 'employee';
}
