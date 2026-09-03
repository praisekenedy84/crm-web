<?php

namespace App\Http\Controllers\Web;

use App\Enums\AreaLevel;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Area;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AreaController extends Controller
{
    use Flashes;

    public function index(): Response
    {
        return Inertia::render('AreasPage', [
            'areas' => Area::with(['parent.parent.parent', 'creator'])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function storeStreet(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_area_id' => ['required', 'exists:areas,id'],
        ]);

        $ward = Area::findOrFail($data['parent_area_id']);

        if ($ward->level !== AreaLevel::Ward) {
            throw ValidationException::withMessages([
                'parent_area_id' => ['Streets must belong to a ward.'],
            ]);
        }

        Area::create([
            'name' => $data['name'],
            'level' => AreaLevel::Street,
            'parent_area_id' => $ward->id,
            'is_custom' => true,
            'created_by' => Auth::id(),
        ]);

        return $this->saved("Street added to {$ward->name}.");
    }

    public function update(Request $request, Area $area): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $before = $area->only(array_keys($data));
        $area->update($data);
        AuditService::log('updated', $area, ['before' => $before, 'after' => $data]);

        return $this->saved('Area name updated.');
    }
}
