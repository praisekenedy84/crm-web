<?php

namespace Database\Seeders;

use App\Enums\AreaLevel;
use App\Enums\BillingCycle;
use App\Enums\ContactStatus;
use App\Enums\PartyType;
use App\Enums\PlatformModule;
use App\Models\Area;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Employee;
use App\Models\ExpenseCategory;
use App\Models\LeaveType;
use App\Models\Party;
use App\Models\PublicHoliday;
use App\Models\Service;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Database\Seeder;

class ErpSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::query()->where('slug', 'demo')->firstOrFail();

        TenantContext::set($tenant);

        $tenant->update([
            'enabled_modules' => array_map(
                fn (PlatformModule $module) => $module->value,
                PlatformModule::cases(),
            ),
        ]);

        $this->seedDarEsSalaamAreas();
        $this->seedTanzaniaPublicHolidays();
        $this->seedLeaveTypes();
        $this->seedExpenseCategories();
        $this->seedChartOfAccounts();
        $this->seedSampleService();
        $this->seedSampleEmployee();
        $this->updateDemoContact();

        TenantContext::clear();

        $this->command?->info('ERP addendum data seeded for demo tenant.');
    }

    private function seedDarEsSalaamAreas(): void
    {
        $region = Area::query()->firstOrCreate(
            [
                'name' => 'Dar es Salaam',
                'level' => AreaLevel::Region,
                'parent_area_id' => null,
            ],
            ['is_custom' => false],
        );

        $districts = [
            'Kinondoni' => ['Sinza A', 'Sinza B', 'Sinza C', 'Mikocheni', 'Kinondoni', 'Msasani', 'Mwenge'],
            'Ilala' => ['Kariakoo', 'Magomeni'],
            'Temeke' => ['Tandale'],
            'Ubungo' => ['Ubungo'],
        ];

        foreach ($districts as $districtName => $wards) {
            $district = Area::query()->firstOrCreate(
                [
                    'name' => $districtName,
                    'level' => AreaLevel::District,
                    'parent_area_id' => $region->id,
                ],
                ['is_custom' => false],
            );

            foreach ($wards as $wardName) {
                Area::query()->firstOrCreate(
                    [
                        'name' => $wardName,
                        'level' => AreaLevel::Ward,
                        'parent_area_id' => $district->id,
                    ],
                    ['is_custom' => false],
                );
            }
        }
    }

    private function seedTanzaniaPublicHolidays(): void
    {
        $holidays = [
            ['name' => "New Year's Day", 'month' => 1, 'day' => 1],
            ['name' => 'Zanzibar Revolution Day', 'month' => 1, 'day' => 12],
            ['name' => 'Union Day', 'month' => 4, 'day' => 26],
            ['name' => 'Labour Day', 'month' => 5, 'day' => 1],
            ['name' => 'Saba Saba', 'month' => 7, 'day' => 7],
            ['name' => 'Nane Nane', 'month' => 8, 'day' => 8],
            ['name' => 'Independence Day', 'month' => 12, 'day' => 9],
            ['name' => 'Christmas Day', 'month' => 12, 'day' => 25],
            ['name' => 'Boxing Day', 'month' => 12, 'day' => 26],
        ];

        TenantContext::clear();

        foreach ($holidays as $holiday) {
            $date = now()->setMonth($holiday['month'])->setDay($holiday['day'])->toDateString();

            PublicHoliday::query()->firstOrCreate(
                [
                    'tenant_id' => null,
                    'name' => $holiday['name'],
                    'date' => $date,
                    'region' => 'Tanzania',
                ],
                ['is_recurring_annually' => true],
            );
        }

        TenantContext::set(Tenant::query()->where('slug', 'demo')->firstOrFail());
    }

    private function seedLeaveTypes(): void
    {
        LeaveType::query()->firstOrCreate(
            ['name' => 'Annual Leave'],
            [
                'default_days_per_year' => 28,
                'is_paid' => true,
            ],
        );

        LeaveType::query()->firstOrCreate(
            ['name' => 'Sick Leave'],
            [
                'default_days_per_year' => 10,
                'is_paid' => true,
            ],
        );
    }

    private function seedExpenseCategories(): void
    {
        foreach (['Office Supplies', 'Utilities', 'Transport', 'Rent'] as $name) {
            ExpenseCategory::query()->firstOrCreate(['name' => $name]);
        }
    }

    private function seedChartOfAccounts(): void
    {
        $accounts = [
            ['code' => '1000', 'name' => 'Cash', 'type' => 'asset'],
            ['code' => '1100', 'name' => 'Accounts Receivable', 'type' => 'asset'],
            ['code' => '2000', 'name' => 'Accounts Payable', 'type' => 'liability'],
            ['code' => '2100', 'name' => 'Salaries Payable', 'type' => 'liability'],
            ['code' => '2200', 'name' => 'Payroll Deductions Payable', 'type' => 'liability'],
            ['code' => '3000', 'name' => 'Equity', 'type' => 'equity'],
            ['code' => '4000', 'name' => 'Revenue', 'type' => 'revenue'],
            ['code' => '5000', 'name' => 'Expenses', 'type' => 'expense'],
            ['code' => '5100', 'name' => 'General Expenses', 'type' => 'expense'],
            ['code' => '5200', 'name' => 'Payroll Expense', 'type' => 'expense'],
        ];

        foreach ($accounts as $account) {
            ChartOfAccount::query()->firstOrCreate(
                ['code' => $account['code']],
                [
                    'name' => $account['name'],
                    'type' => $account['type'],
                    'is_active' => true,
                ],
            );
        }
    }

    private function seedSampleService(): void
    {
        Service::query()->firstOrCreate(
            ['name' => 'Enterprise Software License'],
            [
                'description' => 'Full-featured enterprise CRM and ERP subscription.',
                'price' => 2500,
                'currency' => 'TZS',
                'billing_cycle' => BillingCycle::Monthly,
                'is_active' => true,
            ],
        );
    }

    private function seedSampleEmployee(): void
    {
        $rep = User::query()->where('email', 'rep@demo.com')->firstOrFail();

        $party = Party::query()->firstOrCreate(
            [
                'email' => $rep->email,
                'type' => PartyType::Employee,
            ],
            ['name' => $rep->name],
        );

        Employee::query()->firstOrCreate(
            ['user_id' => $rep->id],
            [
                'party_id' => $party->id,
                'department' => 'Sales',
                'job_title' => 'Sales Representative',
                'employment_status' => 'active',
                'hire_date' => now()->subYear()->toDateString(),
                'salary' => 1200,
                'currency' => 'TZS',
            ],
        );
    }

    private function updateDemoContact(): void
    {
        $contact = Contact::query()
            ->where('email', 'jane.doe@acme.example.com')
            ->first();

        if (! $contact) {
            return;
        }

        $area = Area::query()
            ->where('name', 'Sinza A')
            ->where('level', AreaLevel::Ward)
            ->first();

        if (! $area) {
            return;
        }

        $contact->update([
            'status' => ContactStatus::Inquiry,
            'area_id' => $area->id,
        ]);
    }
}
