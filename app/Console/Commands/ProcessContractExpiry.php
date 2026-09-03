<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\ContractService;
use App\Services\TenantContext;
use Illuminate\Console\Command;

class ProcessContractExpiry extends Command
{
    protected $signature = 'crm:process-contract-expiry';

    protected $description = 'Expire overdue contracts and send renewal reminders';

    public function handle(ContractService $contractService): int
    {
        $totalExpired = 0;
        $totalReminders = 0;

        foreach (Tenant::all() as $tenant) {
            TenantContext::set($tenant);

            $totalExpired += $contractService->expireContracts();
            $totalReminders += $contractService->sendRenewalReminders();

            TenantContext::clear();
        }

        $this->info("Expired {$totalExpired} contract(s), sent {$totalReminders} renewal reminder(s).");

        return self::SUCCESS;
    }
}
