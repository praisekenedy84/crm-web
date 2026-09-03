<?php

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\ActivityController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\ApiKeyController;
use App\Http\Controllers\Api\V1\AreaController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AutomationRuleController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\ContractController;
use App\Http\Controllers\Api\V1\CustomReportController;
use App\Http\Controllers\Api\V1\DealController;
use App\Http\Controllers\Api\V1\EmailController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\FinanceController;
use App\Http\Controllers\Api\V1\ForecastController;
use App\Http\Controllers\Api\V1\HrController;
use App\Http\Controllers\Api\V1\ImportExportController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\LeadScoreController;
use App\Http\Controllers\Api\V1\LeaveController;
use App\Http\Controllers\Api\V1\MarketingContentItemController;
use App\Http\Controllers\Api\V1\ModuleController;
use App\Http\Controllers\Api\V1\PartyController;
use App\Http\Controllers\Api\V1\PerformanceController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\PublicHolidayController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\SmsLogController;
use App\Http\Controllers\Api\V1\SsoController;
use App\Http\Controllers\Api\V1\SyncController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\TerritoryController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\WebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['throttle:api'])->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/auth/sso/{provider}/redirect', [SsoController::class, 'redirect']);
    Route::post('/auth/sso/{provider}/callback', [SsoController::class, 'callback']);

    Route::get('/docs/openapi', fn () => response()->file(base_path('../docs/openapi.yaml'), [
        'Content-Type' => 'application/yaml',
    ]))->withoutMiddleware(['auth:sanctum', 'tenant']);

    Route::middleware(['auth.api', 'auth:sanctum', 'tenant'])->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::apiResource('accounts', AccountController::class);
        Route::apiResource('contacts', ContactController::class);
        Route::patch('contacts/{contact}/status', [ContactController::class, 'updateStatus']);
        Route::apiResource('leads', LeadController::class);
        Route::post('leads/{lead}/convert', [LeadController::class, 'convert']);

        Route::get('pipelines', [DealController::class, 'pipelines']);
        Route::apiResource('deals', DealController::class);
        Route::patch('deals/{deal}/stage', [DealController::class, 'updateStage']);

        Route::apiResource('activities', ActivityController::class)->only(['index', 'store', 'destroy']);
        Route::apiResource('tasks', TaskController::class);

        Route::prefix('marketing')->group(function () {
            Route::get('content-items', [MarketingContentItemController::class, 'index']);
            Route::post('content-items', [MarketingContentItemController::class, 'store']);
            Route::middleware('role:admin,manager')->group(function () {
                Route::get('contributors', [MarketingContentItemController::class, 'contributors']);
                Route::put('content-items/{contentItem}', [MarketingContentItemController::class, 'update']);
                Route::delete('content-items/{contentItem}', [MarketingContentItemController::class, 'destroy']);
            });
        });

        Route::get('attachments', [AttachmentController::class, 'index']);
        Route::post('attachments', [AttachmentController::class, 'store']);
        Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);
        Route::delete('attachments/{attachment}', [AttachmentController::class, 'destroy']);

        Route::prefix('reports')->group(function () {
            Route::get('pipeline-summary', [ReportController::class, 'pipelineSummary']);
            Route::get('conversion-rate', [ReportController::class, 'conversionRate']);
            Route::get('leaderboard', [ReportController::class, 'leaderboard']);
            Route::get('visits-by-area', [ReportController::class, 'visitsByArea']);
            Route::get('leads-per-rep-per-day', [ReportController::class, 'leadsPerRepPerDay']);
        });

        // ERP: Areas & field operations (CRM module)
        Route::middleware('module:crm')->group(function () {
            Route::apiResource('areas', AreaController::class)->except(['destroy']);
            Route::post('areas/streets', [AreaController::class, 'createInlineStreet']);
            Route::post('areas/{area}/merge', [AreaController::class, 'merge'])->middleware('role:manager');

            Route::middleware('role:admin,manager')->group(function () {
                Route::apiResource('services', ServiceController::class);
            });

            Route::apiResource('contracts', ContractController::class);
            Route::apiResource('parties', PartyController::class)->only(['index', 'store', 'show']);
        });

        // ERP: HR module
        Route::middleware('module:hr')->group(function () {
            Route::apiResource('public-holidays', PublicHolidayController::class);

            Route::prefix('leave')->group(function () {
                Route::get('types', [LeaveController::class, 'indexLeaveTypes']);
                Route::post('types', [LeaveController::class, 'storeLeaveType']);
                Route::get('types/{leaveType}', [LeaveController::class, 'showLeaveType']);
                Route::put('types/{leaveType}', [LeaveController::class, 'updateLeaveType']);
                Route::delete('types/{leaveType}', [LeaveController::class, 'destroyLeaveType']);

                Route::get('requests', [LeaveController::class, 'indexLeaveRequests']);
                Route::post('requests', [LeaveController::class, 'storeLeaveRequest']);
                Route::get('requests/{leaveRequest}', [LeaveController::class, 'showLeaveRequest']);
                Route::put('requests/{leaveRequest}', [LeaveController::class, 'updateLeaveRequest']);
                Route::delete('requests/{leaveRequest}', [LeaveController::class, 'destroyLeaveRequest']);
                Route::post('requests/{leaveRequest}/approve', [LeaveController::class, 'approveLeaveRequest'])->middleware('role:admin,manager');
                Route::post('requests/{leaveRequest}/reject', [LeaveController::class, 'rejectLeaveRequest'])->middleware('role:admin,manager');

                Route::get('balances', [LeaveController::class, 'indexLeaveBalances']);
                Route::post('calculate-days', [LeaveController::class, 'calculateDays']);
            });

            Route::prefix('hr')->group(function () {
                Route::get('employees', [HrController::class, 'indexEmployees']);
                Route::post('employees', [HrController::class, 'storeEmployee']);
                Route::get('employees/{employee}', [HrController::class, 'showEmployee']);
                Route::put('employees/{employee}', [HrController::class, 'updateEmployee']);
                Route::delete('employees/{employee}', [HrController::class, 'destroyEmployee']);

                Route::get('attendance', [HrController::class, 'indexAttendance']);
                Route::post('attendance', [HrController::class, 'storeAttendance']);
                Route::get('attendance/{attendanceRecord}', [HrController::class, 'showAttendance']);
                Route::put('attendance/{attendanceRecord}', [HrController::class, 'updateAttendance']);
                Route::delete('attendance/{attendanceRecord}', [HrController::class, 'destroyAttendance']);

                Route::get('payroll-runs', [HrController::class, 'indexPayrollRuns']);
                Route::post('payroll-runs', [HrController::class, 'storePayrollRun']);
                Route::post('payroll-runs/{payrollRun}/process', [HrController::class, 'processPayrollRun'])->middleware('role:admin,manager');
            });

            Route::get('performance/snapshots', [PerformanceController::class, 'index']);
            Route::post('performance/snapshots', [PerformanceController::class, 'generate']);
        });

        // ERP: Finance module
        Route::middleware('module:finance')->group(function () {
            Route::prefix('finance')->group(function () {
                Route::get('accounts', [FinanceController::class, 'indexAccounts']);
                Route::post('accounts', [FinanceController::class, 'storeAccount'])->middleware('role:admin,manager');

                Route::get('invoices', [FinanceController::class, 'indexInvoices']);
                Route::post('invoices', [FinanceController::class, 'storeInvoice']);
                Route::get('invoices/{invoice}', [FinanceController::class, 'showInvoice']);
                Route::post('invoices/{invoice}/payments', [FinanceController::class, 'recordPayment']);

                Route::get('ledger-entries', [FinanceController::class, 'indexLedgerEntries']);
                Route::get('summary', [FinanceController::class, 'financialSummary']);
            });

            Route::prefix('expenses')->group(function () {
                Route::get('categories', [ExpenseController::class, 'indexCategories']);
                Route::post('categories', [ExpenseController::class, 'storeCategory'])->middleware('role:admin,manager');
                Route::get('categories/{expenseCategory}', [ExpenseController::class, 'showCategory']);
                Route::put('categories/{expenseCategory}', [ExpenseController::class, 'updateCategory'])->middleware('role:admin,manager');
                Route::delete('categories/{expenseCategory}', [ExpenseController::class, 'destroyCategory'])->middleware('role:admin,manager');

                Route::get('/', [ExpenseController::class, 'indexExpenses']);
                Route::post('/', [ExpenseController::class, 'storeExpense']);
                Route::get('{expense}', [ExpenseController::class, 'showExpense']);
                Route::put('{expense}', [ExpenseController::class, 'updateExpense']);
                Route::delete('{expense}', [ExpenseController::class, 'destroyExpense']);
                Route::post('{expense}/approve', [ExpenseController::class, 'approveExpense'])->middleware('role:admin,manager');
                Route::post('{expense}/reject', [ExpenseController::class, 'rejectExpense'])->middleware('role:admin,manager');
            });
        });

        // ERP: Inventory module
        Route::middleware('module:inventory')->prefix('inventory')->group(function () {
            Route::get('products', [InventoryController::class, 'indexProducts']);
            Route::post('products', [InventoryController::class, 'storeProduct']);
            Route::get('products/{product}', [InventoryController::class, 'showProduct']);
            Route::put('products/{product}', [InventoryController::class, 'updateProduct']);
            Route::delete('products/{product}', [InventoryController::class, 'destroyProduct']);

            Route::get('warehouses', [InventoryController::class, 'indexWarehouses']);
            Route::post('warehouses', [InventoryController::class, 'storeWarehouse']);
            Route::get('warehouses/{warehouse}', [InventoryController::class, 'showWarehouse']);
            Route::put('warehouses/{warehouse}', [InventoryController::class, 'updateWarehouse']);
            Route::delete('warehouses/{warehouse}', [InventoryController::class, 'destroyWarehouse']);

            Route::get('stock-levels', [InventoryController::class, 'indexStockLevels']);

            Route::get('purchase-orders', [InventoryController::class, 'indexPurchaseOrders']);
            Route::post('purchase-orders', [InventoryController::class, 'storePurchaseOrder']);
            Route::get('purchase-orders/{purchaseOrder}', [InventoryController::class, 'showPurchaseOrder']);
            Route::put('purchase-orders/{purchaseOrder}', [InventoryController::class, 'updatePurchaseOrder']);
            Route::delete('purchase-orders/{purchaseOrder}', [InventoryController::class, 'destroyPurchaseOrder']);
            Route::post('purchase-orders/{purchaseOrder}/approve', [InventoryController::class, 'approvePurchaseOrder'])->middleware('role:admin,manager');
            Route::post('purchase-orders/{purchaseOrder}/goods-receipt', [InventoryController::class, 'goodsReceipt']);
        });

        // ERP: Projects module
        Route::middleware('module:projects')->prefix('projects')->group(function () {
            Route::get('tasks', [ProjectController::class, 'indexTasks']);
            Route::post('tasks', [ProjectController::class, 'storeTask']);
            Route::get('tasks/{projectTask}', [ProjectController::class, 'showTask']);
            Route::put('tasks/{projectTask}', [ProjectController::class, 'updateTask']);
            Route::delete('tasks/{projectTask}', [ProjectController::class, 'destroyTask']);

            Route::get('time-entries', [ProjectController::class, 'indexTimeEntries']);
            Route::post('time-entries', [ProjectController::class, 'storeTimeEntry']);
            Route::get('time-entries/{timeEntry}', [ProjectController::class, 'showTimeEntry']);
            Route::put('time-entries/{timeEntry}', [ProjectController::class, 'updateTimeEntry']);
            Route::delete('time-entries/{timeEntry}', [ProjectController::class, 'destroyTimeEntry']);

            Route::get('/', [ProjectController::class, 'indexProjects']);
            Route::post('/', [ProjectController::class, 'storeProject']);
            Route::get('{project}', [ProjectController::class, 'showProject']);
            Route::put('{project}', [ProjectController::class, 'updateProject']);
            Route::delete('{project}', [ProjectController::class, 'destroyProject']);
        });

        // Admin: module configuration
        Route::middleware('role:admin')->prefix('modules')->group(function () {
            Route::get('/', [ModuleController::class, 'index']);
            Route::put('/', [ModuleController::class, 'update']);
        });

        Route::prefix('import-export')->group(function () {
            Route::get('contacts', [ImportExportController::class, 'exportContacts']);
            Route::get('contacts/csv', [ImportExportController::class, 'downloadContactsCsv']);
            Route::post('contacts', [ImportExportController::class, 'importContacts']);
            Route::get('accounts', [ImportExportController::class, 'exportAccounts']);
            Route::post('leads', [ImportExportController::class, 'importLeads']);
            Route::middleware('module:crm')->group(function () {
                Route::get('areas/template/csv', [ImportExportController::class, 'downloadAreasTemplate']);
                Route::post('areas', [ImportExportController::class, 'importAreas']);
            });
        });

        // Phase 2: Automation, Email, Webhooks, Custom Reports
        Route::apiResource('automation-rules', AutomationRuleController::class);
        Route::get('automation-logs', [AutomationRuleController::class, 'logs']);
        Route::apiResource('webhooks', WebhookController::class);
        Route::get('webhooks/{webhook}/deliveries', [WebhookController::class, 'deliveries']);
        Route::get('email/accounts', [EmailController::class, 'accounts']);
        Route::post('email/accounts', [EmailController::class, 'connectAccount']);
        Route::post('email/accounts/{emailAccount}/sync', [EmailController::class, 'syncAccount']);
        Route::get('email/messages', [EmailController::class, 'messages']);
        Route::get('email/templates', [EmailController::class, 'templates']);
        Route::post('email/templates', [EmailController::class, 'storeTemplate']);
        Route::put('email/templates/{emailTemplate}', [EmailController::class, 'updateTemplate']);
        Route::delete('email/templates/{emailTemplate}', [EmailController::class, 'destroyTemplate']);
        Route::post('email/templates/{emailTemplate}/preview', [EmailController::class, 'previewTemplate']);
        Route::apiResource('custom-reports', CustomReportController::class)->only(['index', 'store', 'destroy']);
        Route::get('custom-reports/{customReport}/run', [CustomReportController::class, 'run']);

        // Phase 3: SMS, Forecasting, Sync
        Route::apiResource('sms-logs', SmsLogController::class)->only(['index', 'store']);
        Route::get('forecast', [ForecastController::class, 'index']);
        Route::get('sync/delta', [SyncController::class, 'delta']);

        // Phase 4: Territories, Lead Scoring, Analytics
        Route::apiResource('territories', TerritoryController::class);
        Route::apiResource('lead-score-rules', LeadScoreController::class);
        Route::post('lead-score-rules/recalculate', [LeadScoreController::class, 'recalculate']);
        Route::get('analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('analytics/audit-logs', [AnalyticsController::class, 'auditLogs']);

        // Admin (Phase 1 completion)
        Route::middleware('role:admin')->group(function () {
            Route::apiResource('users', UserController::class);
            Route::apiResource('api-keys', ApiKeyController::class)->only(['index', 'store', 'destroy']);
        });
    });
});
