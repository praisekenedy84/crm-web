<?php

namespace App\Services;

use App\Jobs\DeliverWebhook;
use App\Models\Webhook;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class WebhookDispatcher
{
    public function emit(string $event, Model $model): void
    {
        $webhooks = Webhook::where('is_active', true)->get();

        $payload = [
            'event' => $event,
            'timestamp' => now()->toIso8601String(),
            'data' => [
                'object_type' => class_basename($model),
                'object_id' => $model->getKey(),
                'attributes' => $model->toArray(),
            ],
        ];

        foreach ($webhooks as $webhook) {
            if (in_array($event, $webhook->events ?? [], true) || in_array('*', $webhook->events ?? [], true)) {
                DeliverWebhook::dispatch($webhook, $event, $payload);
            }
        }
    }

    public static function generateSecret(): string
    {
        return Str::random(32);
    }
}
