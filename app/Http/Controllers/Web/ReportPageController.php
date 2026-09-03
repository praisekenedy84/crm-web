<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\CustomReport;
use App\Services\ForecastService;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportPageController extends Controller
{
    public function __construct(
        private readonly ForecastService $forecast,
        private readonly ReportService $reports,
    ) {}

    public function __invoke(Request $request): Response
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $to = isset($data['to'])
            ? Carbon::parse($data['to'])->toDateString()
            : Carbon::today()->toDateString();
        $from = isset($data['from'])
            ? Carbon::parse($data['from'])->toDateString()
            : Carbon::parse($to)->subDays(30)->toDateString();

        return Inertia::render('ReportsPage', [
            'forecast' => $this->forecast->summary(),
            'customReports' => CustomReport::query()->latest()->get(),
            'salesDone' => $this->reports->salesDone($from, $to),
            'visits' => $this->reports->visitsByArea($from, $to),
            'leadsPerRep' => $this->reports->leadsPerRepPerDay($from, $to),
            'range' => ['from' => $from, 'to' => $to],
        ]);
    }
}
