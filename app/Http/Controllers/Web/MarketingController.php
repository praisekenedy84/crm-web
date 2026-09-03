<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\MarketingContentItem;
use App\Models\User;
use App\Services\AuditService;
use App\Services\TenantContext;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MarketingController extends Controller
{
    use Flashes;

    private const CONTENT_TYPES = ['post', 'carousel', 'reel', 'story', 'video'];

    private const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'other'];

    private const STATUSES = ['idea', 'planned', 'in_progress', 'ready', 'published'];

    public function index(Request $request): Response
    {
        $month = $request->query('month', now()->format('Y-m'));
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end = (clone $start)->endOfMonth();
        $status = $request->query('status');
        $platform = $request->query('platform');

        $query = MarketingContentItem::with([
            'submitter:id,name,email',
            'assignee:id,name,email',
        ])->where(function ($range) use ($start, $end) {
            $range->whereBetween('scheduled_at', [$start, $end])
                ->orWhereNull('scheduled_at');
        });

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($platform && $platform !== 'all') {
            $query->whereJsonContains('platforms', $platform);
        }

        $items = $query
            ->orderByRaw('CASE WHEN scheduled_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('scheduled_at')
            ->latest('created_at')
            ->get();

        $canManage = in_array($request->user()->role->value, ['admin', 'manager'], true);

        return Inertia::render('MarketingPage', [
            'items' => $items,
            'contributors' => $canManage
                ? User::query()
                    ->where('tenant_id', TenantContext::id())
                    ->where('status', 'active')
                    ->orderBy('name')
                    ->get(['id', 'name', 'email', 'role'])
                : [],
            'filters' => [
                'month' => $month,
                'status' => $status ?? 'all',
                'platform' => $platform ?? 'all',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
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

        return $this->saved('Idea added to the marketing backlog.');
    }

    public function update(Request $request, MarketingContentItem $contentItem): RedirectResponse
    {
        abort_unless((int) $contentItem->tenant_id === TenantContext::id(), 404);

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

        return $this->saved('Content plan updated.');
    }

    public function destroy(MarketingContentItem $contentItem): RedirectResponse
    {
        abort_unless((int) $contentItem->tenant_id === TenantContext::id(), 404);
        AuditService::log('deleted', $contentItem);
        $contentItem->delete();

        return $this->saved('Content item deleted.');
    }
}
