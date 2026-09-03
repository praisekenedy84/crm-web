<?php

use App\Http\Controllers\Web\AuthenticatedSessionController;
use App\Http\Controllers\Web\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web routes (Inertia)
|--------------------------------------------------------------------------
|
| This application's own UI. Every route renders an Inertia page from
| resources/js/Pages and authenticates with the session guard.
|
| Third-party/token-authenticated endpoints live in routes/api.php.
|
*/

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware(['auth', 'tenant'])->group(function () {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/', DashboardController::class)->name('dashboard');
});
