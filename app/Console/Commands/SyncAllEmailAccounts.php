<?php

namespace App\Console\Commands;

use App\Jobs\SyncEmailAccount;
use App\Models\EmailAccount;
use Illuminate\Console\Command;

class SyncAllEmailAccounts extends Command
{
    protected $signature = 'crm:sync-emails';
    protected $description = 'Queue email sync for all connected accounts';

    public function handle(): int
    {
        $accounts = EmailAccount::where('sync_enabled', true)->get();

        foreach ($accounts as $account) {
            SyncEmailAccount::dispatch($account);
        }

        $this->info("Queued sync for {$accounts->count()} email accounts.");

        return self::SUCCESS;
    }
}
