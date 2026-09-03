<?php

namespace App\Enums;

enum PlatformModule: string
{
    case Crm = 'crm';
    case Finance = 'finance';
    case Inventory = 'inventory';
    case Hr = 'hr';
    case Projects = 'projects';
}
