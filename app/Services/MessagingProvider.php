<?php

namespace App\Services;

interface MessagingProvider
{
    public function send(string $phone, string $message): bool;
}
