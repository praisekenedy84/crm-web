<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\FinanceReportService;
use Inertia\Inertia;
use Inertia\Response;

class FinancePageController extends Controller
{
    public function __construct(private readonly FinanceReportService $financeReports) {}

    public function __invoke(): Response
    {
        return Inertia::render('FinancePage', [
            'summary' => $this->financeReports->summary(),
            'invoices' => Invoice::with('party')->latest()->paginate(20)->withQueryString(),
        ]);
    }
}
