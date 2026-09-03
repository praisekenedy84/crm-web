<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsPageController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics) {}

    public function __invoke(): Response
    {
        return Inertia::render('AnalyticsPage', [
            'analytics' => $this->analytics->overview(),
        ]);
    }
}
