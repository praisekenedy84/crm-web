<?php

namespace App\Services;

use App\Models\AutomationLog;
use App\Models\AutomationRule;
use App\Models\Contact;
use App\Models\Contract;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Payment;
use App\Models\Task;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AutomationEngine
{
    public function __construct(
        private readonly MessagingProvider $messagingProvider,
    ) {}

    public function dispatch(string $event, Model $model): void
    {
        $rules = AutomationRule::where('is_active', true)
            ->where('trigger_event', $event)
            ->where(function ($q) use ($model) {
                $q->whereNull('object_type')
                    ->orWhere('object_type', $model->getMorphClass());
            })
            ->get();

        foreach ($rules as $rule) {
            if ($this->matchesConditions($rule, $model)) {
                $this->executeActions($rule, $model);
            }
        }
    }

    private function matchesConditions(AutomationRule $rule, Model $model): bool
    {
        $conditions = $rule->conditions ?? [];

        foreach ($conditions as $condition) {
            $field = $condition['field'] ?? null;
            $operator = $condition['operator'] ?? 'equals';
            $expected = $condition['value'] ?? null;
            $actual = data_get($model, $field);

            if ($operator === 'equals' && (string) $actual !== (string) $expected) {
                return false;
            }

            if ($operator === 'not_equals' && (string) $actual === (string) $expected) {
                return false;
            }
        }

        return true;
    }

    private function executeActions(AutomationRule $rule, Model $model): void
    {
        $results = [];

        foreach ($rule->actions as $action) {
            $type = $action['type'] ?? null;

            try {
                match ($type) {
                    'create_task' => $this->createTask($action, $model),
                    'update_field' => $this->updateField($action, $model),
                    'send_webhook' => app(WebhookDispatcher::class)->emit($action['event'] ?? 'automation', $model),
                    'send_sms' => $this->sendSms($action, $model),
                    default => null,
                };
                $results[] = ['type' => $type, 'status' => 'success'];
            } catch (\Throwable $e) {
                $results[] = ['type' => $type, 'status' => 'failed', 'error' => $e->getMessage()];
            }
        }

        AutomationLog::create([
            'tenant_id' => TenantContext::id(),
            'rule_id' => $rule->id,
            'object_type' => $model->getMorphClass(),
            'object_id' => $model->getKey(),
            'status' => collect($results)->contains('status', 'failed') ? 'partial' : 'success',
            'result' => $results,
            'executed_at' => now(),
        ]);
    }

    private function createTask(array $action, Model $model): void
    {
        Task::create([
            'title' => $action['title'] ?? 'Automated task',
            'description' => $action['description'] ?? null,
            'due_date' => isset($action['due_days']) ? now()->addDays($action['due_days']) : null,
            'priority' => $action['priority'] ?? 'medium',
            'assignee_id' => $action['assignee_id'] ?? Auth::id(),
            'related_type' => $model->getMorphClass(),
            'related_id' => $model->getKey(),
        ]);
    }

    private function updateField(array $action, Model $model): void
    {
        $field = $action['field'] ?? null;
        $value = $action['value'] ?? null;

        if ($field) {
            $model->update([$field => $value]);
        }
    }

    private function sendSms(array $action, Model $model): void
    {
        $phone = $this->resolvePhone($model);
        $template = $action['template'] ?? $action['message'] ?? '';

        if (! $phone || $template === '') {
            return;
        }

        $message = $this->renderTemplate($template, $model);
        $this->messagingProvider->send($phone, $message);
    }

    private function resolvePhone(Model $model): ?string
    {
        if ($model instanceof Contact) {
            return $model->phone;
        }

        if ($model instanceof Contract) {
            $model->loadMissing(['contact', 'party']);

            return $model->contact?->phone ?? $model->party?->phone;
        }

        if ($model instanceof Payment) {
            $model->loadMissing('invoice.party');

            return $model->invoice?->party?->phone;
        }

        return $model->phone ?? null;
    }

    private function renderTemplate(string $template, Model $model): string
    {
        $replacements = [];

        if ($model instanceof Contact) {
            $replacements['{{contact.first_name}}'] = $model->first_name;
            $replacements['{{contact.last_name}}'] = $model->last_name;
        }

        if ($model instanceof Contract) {
            $model->loadMissing(['contact', 'service']);
            $replacements['{{contact.first_name}}'] = $model->contact?->first_name ?? '';
            $replacements['{{service.name}}'] = $model->service?->name ?? '';
        }

        if ($model instanceof Payment) {
            $model->loadMissing('invoice');
            $replacements['{{payment.amount}}'] = (string) $model->amount;
            $replacements['{{invoice.number}}'] = $model->invoice?->invoice_number ?? '';
        }

        return strtr($template, $replacements);
    }
}
