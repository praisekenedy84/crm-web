<?php

namespace App\Http\Controllers\Web;

use App\Enums\PlatformModule;
use App\Http\Controllers\Controller;
use App\Services\FinanceReportService;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly ReportService $reports,
        private readonly FinanceReportService $financeReports,
    ) {}

    public function __invoke(Request $request): Response
    {
        $financeEnabled = in_array(
            PlatformModule::Finance->value,
            $request->user()?->tenant?->enabled_modules ?? ['crm'],
            true,
        );

        return Inertia::render('DashboardPage', [
            'pipeline' => $this->reports->pipelineSummary(),
            'conversion' => $this->reports->conversionRate(),
            'leaderboard' => $this->reports->leaderboard(),
            'financeEnabled' => $financeEnabled,
            'financialSummary' => $financeEnabled ? $this->financeReports->summary() : null,
        ]);
    }
}
