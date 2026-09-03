<?php

namespace App\Http\Controllers\Web\Concerns;

use Illuminate\Http\RedirectResponse;

trait Flashes
{
    protected function saved(string $message): RedirectResponse
    {
        return back()->with('success', $message);
    }

    protected function failed(string $message): RedirectResponse
    {
        return back()->with('error', $message);
    }
}
