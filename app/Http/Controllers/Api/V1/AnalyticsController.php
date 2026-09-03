<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics) {}

    public function overview(): JsonResponse
    {
        return response()->json($this->analytics->overview());
    }

    public function auditLogs(): JsonResponse
    {
        return response()->json($this->analytics->auditLogs());
    }
}
