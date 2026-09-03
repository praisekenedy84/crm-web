<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogsPageController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics) {}

    public function __invoke(Request $request): Response
    {
        return Inertia::render('AuditLogsPage', [
            'auditLogs' => $this->analytics->auditLogs(
                (int) $request->query('per_page', 20),
            ),
        ]);
    }
}
