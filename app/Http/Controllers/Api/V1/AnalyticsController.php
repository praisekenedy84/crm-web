<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\AuditLog;
use App\Models\Deal;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Project;
use App\Models\StockLevel;
use App\Services\ModuleService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function overview(): JsonResponse
    {
        $modules = app(ModuleService::class);
        $tenant = TenantContext::get();

        $data = [
            'counts' => [
                'leads' => Lead::count(),
                'open_deals' => Deal::where('status', 'open')->count(),
                'won_deals' => Deal::where('status', 'won')->count(),
                'activities_this_month' => Activity::where('occurred_at', '>=', now()->startOfMonth())->count(),
            ],
            'revenue' => [
                'won_total' => Deal::where('status', 'won')->sum('value'),
                'pipeline_total' => Deal::where('status', 'open')->sum('value'),
            ],
            'top_lead_sources' => Lead::select('source', DB::raw('count(*) as count'))
                ->groupBy('source')
                ->orderByDesc('count')
                ->limit(5)
                ->get(),
            'deal_velocity' => Deal::where('status', 'won')
                ->select(DB::raw('avg(julianday(closed_at) - julianday(created_at)) as avg_days'))
                ->value('avg_days'),
            'enabled_modules' => $tenant?->enabled_modules ?? ['crm'],
        ];

        if ($modules->isEnabled('finance')) {
            $data['finance'] = [
                'outstanding_receivables' => (float) Invoice::whereIn('status', ['sent', 'partial', 'overdue'])
                    ->selectRaw('SUM(total_amount - amount_paid) as outstanding')
                    ->value('outstanding') ?? 0,
                'paid_this_month' => (float) Payment::where('paid_at', '>=', now()->startOfMonth())->sum('amount'),
            ];
        }

        if ($modules->isEnabled('inventory')) {
            $data['inventory'] = [
                'product_count' => Product::where('is_active', true)->count(),
                'stock_value' => (float) StockLevel::query()
                    ->join('products', 'products.id', '=', 'stock_levels.product_id')
                    ->selectRaw('SUM(stock_levels.quantity * products.unit_price) as value')
                    ->value('value') ?? 0,
            ];
        }

        if ($modules->isEnabled('hr')) {
            $data['hr'] = [
                'active_employees' => Employee::where('employment_status', 'active')->count(),
                'payroll_cost_this_month' => (float) Employee::where('employment_status', 'active')->sum('salary'),
            ];
        }

        if ($modules->isEnabled('projects')) {
            $data['projects'] = [
                'active_projects' => Project::where('status', 'active')->count(),
                'total_budget' => (float) Project::where('status', 'active')->sum('budget'),
                'total_actual_cost' => (float) Project::where('status', 'active')->sum('actual_cost'),
            ];
        }

        return response()->json($data);
    }

    public function auditLogs(): JsonResponse
    {
        return response()->json(
            AuditLog::with('user')->latest('created_at')->paginate(50)
        );
    }
}
