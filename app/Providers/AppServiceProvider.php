<?php

namespace App\Providers;

use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Task;
use App\Policies\AccountPolicy;
use App\Policies\ContactPolicy;
use App\Policies\DealPolicy;
use App\Policies\LeadPolicy;
use App\Policies\TaskPolicy;
use App\Services\MessagingProvider;
use App\Services\StubMessagingProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MessagingProvider::class, StubMessagingProvider::class);
    }

    public function boot(): void
    {
        Gate::policy(Contact::class, ContactPolicy::class);
        Gate::policy(Account::class, AccountPolicy::class);
        Gate::policy(Lead::class, LeadPolicy::class);
        Gate::policy(Deal::class, DealPolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
