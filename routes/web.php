<?php

use App\Http\Controllers\Web\AccountController;
use App\Http\Controllers\Web\AnalyticsPageController;
use App\Http\Controllers\Web\AreaController;
use App\Http\Controllers\Web\AuditLogsPageController;
use App\Http\Controllers\Web\AuthenticatedSessionController;
use App\Http\Controllers\Web\ContactController;
use App\Http\Controllers\Web\ContractPageController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\DealController;
use App\Http\Controllers\Web\ExpenseController;
use App\Http\Controllers\Web\FinancePageController;
use App\Http\Controllers\Web\HrPageController;
use App\Http\Controllers\Web\ImportController;
use App\Http\Controllers\Web\InventoryPageController;
use App\Http\Controllers\Web\LeadController;
use App\Http\Controllers\Web\MarketingController;
use App\Http\Controllers\Web\ProjectPageController;
use App\Http\Controllers\Web\ReportPageController;
use App\Http\Controllers\Web\RoleController;
use App\Http\Controllers\Web\SettingsController;
use App\Http\Controllers\Web\TaskController;
use App\Http\Controllers\Web\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web routes (Inertia)
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware(['auth', 'tenant'])->group(function () {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/', DashboardController::class)->name('dashboard');

        Route::middleware('permission:contacts.view.own|contacts.view.team|contacts.view.all')->group(function () {
        Route::get('/contacts', [ContactController::class, 'index'])->name('contacts.index');
        Route::post('/contacts', [ContactController::class, 'store'])->middleware('permission:contacts.create')->name('contacts.store');
        Route::put('/contacts/{contact}', [ContactController::class, 'update'])->middleware('permission:contacts.update')->name('contacts.update');
        Route::delete('/contacts/{contact}', [ContactController::class, 'destroy'])->middleware('permission:contacts.delete')->name('contacts.destroy');
        Route::post('/contacts/{contact}/create-lead', [ContactController::class, 'createLead'])->middleware('permission:leads.create')->name('contacts.create-lead');
    });

    Route::middleware('permission:accounts.view.own|accounts.view.team|accounts.view.all')->group(function () {
        Route::get('/accounts', [AccountController::class, 'index'])->name('accounts.index');
        Route::post('/accounts', [AccountController::class, 'store'])->middleware('permission:accounts.create')->name('accounts.store');
        Route::put('/accounts/{account}', [AccountController::class, 'update'])->middleware('permission:accounts.update')->name('accounts.update');
        Route::delete('/accounts/{account}', [AccountController::class, 'destroy'])->middleware('permission:accounts.delete')->name('accounts.destroy');
    });

    Route::middleware('permission:leads.view.own|leads.view.team|leads.view.all')->group(function () {
        Route::get('/leads', [LeadController::class, 'index'])->name('leads.index');
        Route::post('/leads', [LeadController::class, 'store'])->middleware('permission:leads.create')->name('leads.store');
        Route::put('/leads/{lead}', [LeadController::class, 'update'])->middleware('permission:leads.update')->name('leads.update');
        Route::delete('/leads/{lead}', [LeadController::class, 'destroy'])->middleware('permission:leads.delete')->name('leads.destroy');
        Route::post('/leads/{lead}/convert', [LeadController::class, 'convert'])->middleware('permission:leads.convert')->name('leads.convert');
    });

    Route::middleware('permission:deals.view.own|deals.view.team|deals.view.all')->group(function () {
        Route::get('/deals', [DealController::class, 'index'])->name('deals.index');
        Route::post('/deals', [DealController::class, 'store'])->middleware('permission:deals.create')->name('deals.store');
        Route::put('/deals/{deal}', [DealController::class, 'update'])->middleware('permission:deals.update')->name('deals.update');
        Route::patch('/deals/{deal}/stage', [DealController::class, 'updateStage'])->middleware('permission:deals.move_stage')->name('deals.stage');
        Route::delete('/deals/{deal}', [DealController::class, 'destroy'])->middleware('permission:deals.delete')->name('deals.destroy');
    });

    Route::middleware('permission:tasks.view.own|tasks.view.team|tasks.view.all')->group(function () {
        Route::get('/tasks', [TaskController::class, 'index'])->name('tasks.index');
        Route::post('/tasks', [TaskController::class, 'store'])->middleware('permission:tasks.create')->name('tasks.store');
        Route::put('/tasks/{task}', [TaskController::class, 'update'])->middleware('permission:tasks.update')->name('tasks.update');
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->middleware('permission:tasks.delete')->name('tasks.destroy');
    });

    Route::get('/reports', ReportPageController::class)->middleware('permission:reports.view')->name('reports');
    Route::get('/analytics', AnalyticsPageController::class)->middleware('permission:analytics.view')->name('analytics');
    Route::get('/audit-logs', AuditLogsPageController::class)->middleware('permission:settings.view')->name('audit-logs');
    Route::get('/settings', SettingsController::class)->middleware('permission:settings.view')->name('settings');

    Route::middleware('permission:import.run')->group(function () {
        Route::get('/import', [ImportController::class, 'index'])->name('import');
        Route::post('/import/contacts', [ImportController::class, 'importContacts'])->name('import.contacts');
        Route::post('/import/areas', [ImportController::class, 'importAreas'])->name('import.areas');
        Route::get('/import/contacts/csv', [ImportController::class, 'downloadContactsCsv'])->name('import.contacts.csv');
        Route::get('/import/areas/template', [ImportController::class, 'downloadAreasTemplate'])->name('import.areas.template');
    });

    Route::middleware('permission:marketing.view')->group(function () {
        Route::get('/marketing', [MarketingController::class, 'index'])->name('marketing.index');
        Route::post('/marketing', [MarketingController::class, 'store'])->middleware('permission:marketing.create')->name('marketing.store');
        Route::put('/marketing/{contentItem}', [MarketingController::class, 'update'])->middleware('permission:marketing.manage')->name('marketing.update');
        Route::delete('/marketing/{contentItem}', [MarketingController::class, 'destroy'])->middleware('permission:marketing.manage')->name('marketing.destroy');
    });

    Route::middleware('permission:users.view')->group(function () {
        Route::get('/admin/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/admin/users', [UserController::class, 'store'])->middleware('permission:users.manage')->name('users.store');
        Route::put('/admin/users/{user}', [UserController::class, 'update'])->middleware('permission:users.manage')->name('users.update');
        Route::delete('/admin/users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.manage')->name('users.destroy');
    });

    Route::middleware('permission:roles.manage')->group(function () {
        Route::get('/admin/roles', [RoleController::class, 'index'])->name('roles.index');
        Route::put('/admin/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    });

    Route::middleware(['module:crm', 'permission:areas.view'])->group(function () {
        Route::get('/areas', [AreaController::class, 'index'])->name('areas.index');
        Route::post('/areas/streets', [AreaController::class, 'storeStreet'])->middleware('permission:areas.create')->name('areas.streets.store');
        Route::put('/areas/{area}', [AreaController::class, 'update'])->middleware('permission:areas.update')->name('areas.update');
    });

    Route::middleware(['module:crm', 'permission:contracts.view'])->group(function () {
        Route::get('/contracts', [ContractPageController::class, 'index'])->name('contracts.index');
        Route::post('/contracts', [ContractPageController::class, 'store'])->middleware('permission:contracts.create')->name('contracts.store');
        Route::put('/contracts/{contract}', [ContractPageController::class, 'update'])->middleware('permission:contracts.update')->name('contracts.update');
        Route::delete('/contracts/{contract}', [ContractPageController::class, 'destroy'])->middleware('permission:contracts.delete')->name('contracts.destroy');
    });

    Route::middleware(['module:finance', 'permission:finance.view'])->group(function () {
        Route::get('/finance', FinancePageController::class)->name('finance');
    });

    Route::middleware(['module:finance', 'permission:expenses.view'])->group(function () {
        Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
        Route::post('/expenses', [ExpenseController::class, 'store'])->middleware('permission:expenses.create')->name('expenses.store');
        Route::put('/expenses/{expense}', [ExpenseController::class, 'update'])->middleware('permission:expenses.update')->name('expenses.update');
        Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->middleware('permission:expenses.delete')->name('expenses.destroy');
    });

    Route::middleware(['module:inventory', 'permission:inventory.view'])->group(function () {
        Route::get('/inventory', [InventoryPageController::class, 'index'])->name('inventory.index');
        Route::post('/inventory/products', [InventoryPageController::class, 'storeProduct'])->middleware('permission:inventory.create')->name('inventory.products.store');
        Route::put('/inventory/products/{product}', [InventoryPageController::class, 'updateProduct'])->middleware('permission:inventory.update')->name('inventory.products.update');
        Route::delete('/inventory/products/{product}', [InventoryPageController::class, 'destroyProduct'])->middleware('permission:inventory.delete')->name('inventory.products.destroy');
        Route::delete('/inventory/purchase-orders/{purchaseOrder}', [InventoryPageController::class, 'destroyPurchaseOrder'])->middleware('permission:inventory.delete')->name('inventory.orders.destroy');
    });

    Route::middleware(['module:hr', 'permission:hr.view'])->group(function () {
        Route::get('/hr', [HrPageController::class, 'index'])->name('hr.index');
        Route::post('/hr/leave/{leaveRequest}/approve', [HrPageController::class, 'approveLeave'])
            ->middleware('permission:hr.leave.approve')
            ->name('hr.leave.approve');
        Route::delete('/hr/leave/{leaveRequest}', [HrPageController::class, 'destroyLeave'])->middleware('permission:hr.delete')->name('hr.leave.destroy');
        Route::post('/hr/employees', [HrPageController::class, 'storeEmployee'])->middleware('permission:hr.create')->name('hr.employees.store');
        Route::put('/hr/employees/{employee}', [HrPageController::class, 'updateEmployee'])->middleware('permission:hr.update')->name('hr.employees.update');
        Route::delete('/hr/employees/{employee}', [HrPageController::class, 'destroyEmployee'])->middleware('permission:hr.delete')->name('hr.employees.destroy');
    });

    Route::middleware(['module:projects', 'permission:projects.view'])->group(function () {
        Route::get('/projects', [ProjectPageController::class, 'index'])->name('projects.index');
        Route::post('/projects', [ProjectPageController::class, 'store'])->middleware('permission:projects.create')->name('projects.store');
        Route::put('/projects/{project}', [ProjectPageController::class, 'update'])->middleware('permission:projects.update')->name('projects.update');
        Route::delete('/projects/{project}', [ProjectPageController::class, 'destroy'])->middleware('permission:projects.delete')->name('projects.destroy');
    });
});
