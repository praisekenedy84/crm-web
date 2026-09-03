<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AreaLevel;
use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Services\AreaService;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AreaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Area::with(['parent.parent.parent', 'creator'])->orderBy('name');

        if ($level = $request->query('level')) {
            $query->where('level', $level);
        }

        if ($parentId = $request->query('parent_id')) {
            $query->where('parent_area_id', $parentId);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'level' => ['required', Rule::enum(AreaLevel::class)],
            'parent_area_id' => ['nullable', 'exists:areas,id'],
            'is_custom' => ['nullable', 'boolean'],
        ]);

        $this->validateHierarchy(
            AreaLevel::from($data['level']),
            isset($data['parent_area_id']) ? (int) $data['parent_area_id'] : null,
        );

        $data['created_by'] = Auth::id();
        $data['is_custom'] ??= false;

        $area = Area::create($data);
        AuditService::log('created', $area);

        return response()->json($area->load(['parent', 'creator']), 201);
    }

    public function show(Area $area): JsonResponse
    {
        return response()->json($area->load(['parent.parent.parent', 'children', 'creator']));
    }

    public function update(Request $request, Area $area): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'parent_area_id' => ['nullable', 'exists:areas,id'],
        ]);

        if (array_key_exists('parent_area_id', $data)) {
            $this->validateHierarchy(
                $area->level,
                isset($data['parent_area_id']) ? (int) $data['parent_area_id'] : null,
            );
        }

        $before = $area->only(array_keys($data));
        $area->update($data);
        AuditService::log('updated', $area, ['before' => $before, 'after' => $data]);

        return response()->json($area->load(['parent', 'creator']));
    }

    public function merge(Request $request, Area $area, AreaService $areaService): JsonResponse
    {
        $data = $request->validate([
            'target_area_id' => ['required', 'exists:areas,id', 'not_in:'.$area->id],
        ]);

        $merged = $areaService->mergeStreets($area->id, (int) $data['target_area_id']);

        return response()->json($merged->load(['parent', 'creator']));
    }

    public function createInlineStreet(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_area_id' => ['required', 'exists:areas,id'],
        ]);

        $ward = Area::findOrFail($data['parent_area_id']);

        $this->validateHierarchy(AreaLevel::Street, $ward->id);

        $area = Area::create([
            'name' => $data['name'],
            'level' => AreaLevel::Street,
            'parent_area_id' => $ward->id,
            'is_custom' => true,
            'created_by' => Auth::id(),
        ]);

        AuditService::log('created', $area);

        return response()->json($area->load(['parent', 'creator']), 201);
    }

    private function validateHierarchy(AreaLevel $level, ?int $parentId): void
    {
        $expectedParentLevel = match ($level) {
            AreaLevel::Region => null,
            AreaLevel::District => AreaLevel::Region,
            AreaLevel::Ward => AreaLevel::District,
            AreaLevel::Street => AreaLevel::Ward,
        };

        if ($expectedParentLevel === null) {
            if ($parentId !== null) {
                throw ValidationException::withMessages([
                    'parent_area_id' => ['A region cannot belong to another area.'],
                ]);
            }

            return;
        }

        if ($parentId === null) {
            throw ValidationException::withMessages([
                'parent_area_id' => ["A {$level->value} must belong to a {$expectedParentLevel->value}."],
            ]);
        }

        $parent = Area::find($parentId);

        if (! $parent || $parent->level !== $expectedParentLevel || ! $this->hasValidAncestry($parent)) {
            throw ValidationException::withMessages([
                'parent_area_id' => [
                    "A {$level->value} must belong to a valid {$expectedParentLevel->value} hierarchy.",
                ],
            ]);
        }
    }

    private function hasValidAncestry(Area $area): bool
    {
        $expectedParentLevel = match ($area->level) {
            AreaLevel::Region => null,
            AreaLevel::District => AreaLevel::Region,
            AreaLevel::Ward => AreaLevel::District,
            AreaLevel::Street => AreaLevel::Ward,
        };

        if ($expectedParentLevel === null) {
            return $area->parent_area_id === null;
        }

        $parent = $area->parent;

        return $parent !== null
            && $parent->level === $expectedParentLevel
            && $this->hasValidAncestry($parent);
    }
}
