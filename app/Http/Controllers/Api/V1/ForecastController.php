<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ForecastService;
use Illuminate\Http\JsonResponse;

class ForecastController extends Controller
{
    public function __construct(private readonly ForecastService $forecast) {}

    public function index(): JsonResponse
    {
        return response()->json($this->forecast->summary());
    }
}
