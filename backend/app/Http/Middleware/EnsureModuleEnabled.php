<?php

namespace App\Http\Middleware;

use App\Services\ModuleService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleEnabled
{
    public function __construct(
        private readonly ModuleService $moduleService,
    ) {}

    public function handle(Request $request, Closure $next, string $module): Response
    {
        $this->moduleService->requireModule($module);

        return $next($request);
    }
}
