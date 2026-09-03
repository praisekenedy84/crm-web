<?php

namespace App\Enums;

enum AreaLevel: string
{
    case Region = 'region';
    case District = 'district';
    case Ward = 'ward';
    case Street = 'street';
}
