<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $currencyTables = [
        'deals',
        'services',
        'contracts',
        'expenses',
        'invoices',
        'invoice_lines',
        'products',
        'purchase_orders',
        'payroll_runs',
        'projects',
        'employees',
    ];

    public function up(): void
    {
        if (Schema::hasTable('tenants')) {
            DB::table('tenants')->update(['default_currency' => 'TZS']);
        }

        foreach ($this->currencyTables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'currency')) {
                DB::table($table)->where('currency', 'USD')->update(['currency' => 'TZS']);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tenants')) {
            DB::table('tenants')->update(['default_currency' => 'USD']);
        }

        foreach ($this->currencyTables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'currency')) {
                DB::table($table)->where('currency', 'TZS')->update(['currency' => 'USD']);
            }
        }
    }
};
