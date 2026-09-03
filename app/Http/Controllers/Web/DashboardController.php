<?php

namespace App\Http\Controllers\Web;

use App\Enums\PlatformModule;
use App\Http\Controllers\Controller;
use App\Services\ModuleService;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly ReportService $reports) {}

    public function __invoke(Request $request): Response
    {
        $financeEnabled = in_array(
            PlatformModule::Finance->value,
            $request->user()?->tenant?->enabled_modules ?? ['crm'],
            true,
        );

        return Inertia::render('DashboardPage', [
            'pipeline' => fn () => $this->reports->pipelineSummary(),
            'conversion' => fn () => $this->reports->conversionRate(),
            'leaderboard' => fn () => $this->reports->leaderboard(),
            'financeEnabled' => $financeEnabled,
        ]);
    }
}
