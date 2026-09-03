<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Account;
use App\Services\AccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    use Flashes;

    public function __construct(private readonly AccountService $accounts) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', \App\Models\Account::class);
        return Inertia::render('AccountsPage', [
            'accounts' => $this->accounts->paginate($request->query('search')),
            'filters' => [
                'search' => $request->query('search', ''),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', \App\Models\Account::class);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'area_id' => ['nullable', 'exists:areas,id'],
        ]);

        $this->accounts->store($data);

        return $this->saved('Account created.');
    }

    public function update(Request $request, Account $account): RedirectResponse
    {
        $this->authorize('update', $account);
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'area_id' => ['nullable', 'exists:areas,id'],
        ]);

        $this->accounts->update($account, $data);

        return $this->saved('Account updated.');
    }

    public function destroy(Account $account): RedirectResponse
    {
        $this->authorize('delete', $account);
        $this->accounts->destroy($account);

        return $this->saved('Account deleted.');
    }
}
