<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('crm:send-task-reminders')->dailyAt('08:00');
Schedule::command('crm:sync-emails')->everyFiveMinutes();
Schedule::command('crm:process-contract-expiry')->daily();
Schedule::command('crm:generate-performance-snapshots')->monthly();
