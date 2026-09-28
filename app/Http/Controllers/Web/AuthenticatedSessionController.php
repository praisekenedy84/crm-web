<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Services\AuthenticationService;
use App\Services\ImpersonationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function __construct(
        private readonly AuthenticationService $auth,
        private readonly ImpersonationService $impersonation,
    ) {}

    public function create(): Response|RedirectResponse
    {
        if (Auth::check()) {
            if (Auth::user()?->is_platform_admin) {
                return redirect()->route('platform.god-eye');
            }

            return redirect()->route('dashboard');
        }

        return Inertia::render('LoginPage');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Throws ValidationException on bad credentials or a locked account, which
        // Inertia surfaces back on the login page as form errors.
        $user = $this->auth->attempt($credentials['email'], $credentials['password']);

        $this->impersonation->clear($request);

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        if ($user->is_platform_admin) {
            return redirect()->intended(route('platform.god-eye'));
        }

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $this->impersonation->clear($request);

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
