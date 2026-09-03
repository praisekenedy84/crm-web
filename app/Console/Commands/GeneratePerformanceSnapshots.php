<?php

namespace App\Console\Commands;

use App\Enums\PartyType;
use App\Models\Party;
use App\Models\Tenant;
use App\Services\PerformanceSnapshotService;
use App\Services\TenantContext;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GeneratePerformanceSnapshots extends Command
{
    protected $signature = 'crm:generate-performance-snapshots';

    protected $description = 'Generate monthly performance snapshots for all employees';

    public function handle(PerformanceSnapshotService $snapshotService): int
    {
        $start = Carbon::now()->subMonth()->startOfMonth();
        $end = Carbon::now()->subMonth()->endOfMonth();
        $count = 0;

        foreach (Tenant::all() as $tenant) {
            TenantContext::set($tenant);

            $employees = Party::query()
                ->where('type', PartyType::Employee)
                ->get();

            foreach ($employees as $employee) {
                $snapshotService->generateForEmployee($employee, $start, $end);
                $count++;
            }

            TenantContext::clear();
        }

        $this->info("Generated {$count} performance snapshot(s) for {$start->format('Y-m')}.");

        return self::SUCCESS;
    }
}
