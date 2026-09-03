<?php

namespace App\Enums;

enum ContactStatus: string
{
    case Inquiry = 'inquiry';
    case Potential = 'potential';
    case Lead = 'lead';
    case Customer = 'customer';
}
