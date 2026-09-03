<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MarketingContentItem;
use App\Models\User;
use App\Services\AuditService;
use App\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MarketingContentItemController extends Controller
{
    private const CONTENT_TYPES = ['post', 'carousel', 'reel', 'story', 'video'];

    private const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'other'];

    private const STATUSES = ['idea', 'planned', 'in_progress', 'ready', 'published'];

    public function contributors(): JsonResponse
    {
        return response()->json(
            User::query()
                ->where('tenant_id', TenantContext::id())
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role'])
        );
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'include_unscheduled' => ['nullable', 'boolean'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'platform' => ['nullable', Rule::in(self::PLATFORMS)],
        ]);

        $query = MarketingContentItem::with([
            'submitter:id,name,email',
            'assignee:id,name,email',
        ]);

        if (! empty($data['from']) && ! empty($data['to'])) {
            $query->where(function ($range) use ($data): void {
                $range->whereBetween('scheduled_at', [
                    $data['from'].' 00:00:00',
                    $data['to'].' 23:59:59',
                ]);

                if ($data['include_unscheduled'] ?? false) {
                    $range->orWhereNull('scheduled_at');
                }
            });
        }

        if (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }

        if (! empty($data['platform'])) {
            $query->whereJsonContains('platforms', $data['platform']);
        }

        return response()->json(
            $query
                ->orderByRaw('CASE WHEN scheduled_at IS NULL THEN 1 ELSE 0 END')
                ->orderBy('scheduled_at')
                ->latest('created_at')
                ->paginate(100)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'brief' => ['nullable', 'string', 'max:5000'],
            'content_type' => ['required', Rule::in(self::CONTENT_TYPES)],
            'platforms' => ['required', 'array', 'min:1'],
            'platforms.*' => ['required', 'distinct', Rule::in(self::PLATFORMS)],
            'proposed_date' => ['nullable', 'date'],
        ]);

        $data['submitted_by'] = $request->user()->id;
        $data['status'] = 'idea';

        $item = MarketingContentItem::create($data);
        AuditService::log('created', $item);

        return response()->json($item->load(['submitter:id,name,email', 'assignee:id,name,email']), 201);
    }

    public function update(Request $request, MarketingContentItem $contentItem): JsonResponse
    {
        $this->assertTenantOwnership($contentItem);
        $tenantId = TenantContext::id();
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'brief' => ['nullable', 'string', 'max:5000'],
            'content_type' => ['sometimes', Rule::in(self::CONTENT_TYPES)],
            'platforms' => ['sometimes', 'array', 'min:1'],
            'platforms.*' => ['required', 'distinct', Rule::in(self::PLATFORMS)],
            'proposed_date' => ['nullable', 'date'],
            'scheduled_at' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'assigned_to' => [
                'nullable',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('tenant_id', $tenantId)),
            ],
        ]);

        $nextStatus = $data['status'] ?? $contentItem->status;
        $scheduledAt = array_key_exists('scheduled_at', $data)
            ? $data['scheduled_at']
            : $contentItem->scheduled_at;

        if ($nextStatus !== 'idea' && ! $scheduledAt) {
            throw ValidationException::withMessages([
                'scheduled_at' => 'Choose a schedule date and time before moving this item out of ideas.',
            ]);
        }

        if (! empty($data['scheduled_at']) && $nextStatus === 'idea' && ! array_key_exists('status', $data)) {
            $data['status'] = 'planned';
        }

        $contentItem->update($data);
        AuditService::log('updated', $contentItem, $data);

        return response()->json($contentItem->load(['submitter:id,name,email', 'assignee:id,name,email']));
    }

    public function destroy(MarketingContentItem $contentItem): JsonResponse
    {
        $this->assertTenantOwnership($contentItem);
        AuditService::log('deleted', $contentItem);
        $contentItem->delete();

        return response()->json(['message' => 'Content item deleted.']);
    }

    private function assertTenantOwnership(MarketingContentItem $contentItem): void
    {
        abort_unless((int) $contentItem->tenant_id === TenantContext::id(), 404);
    }
}
