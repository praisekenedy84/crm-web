<?php

namespace App\Jobs;

use App\Models\Webhook;
use App\Models\WebhookDelivery;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;

class DeliverWebhook implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(
        public Webhook $webhook,
        public string $event,
        public array $payload,
    ) {}

    public function handle(): void
    {
        $body = json_encode($this->payload);
        $signature = hash_hmac('sha256', $body, $this->webhook->secret);

        $delivery = WebhookDelivery::create([
            'webhook_id' => $this->webhook->id,
            'event' => $this->event,
            'payload' => $this->payload,
            'attempts' => $this->attempts(),
            'status' => 'pending',
        ]);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'X-Webhook-Signature' => $signature,
                    'X-Webhook-Event' => $this->event,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->webhook->url, $this->payload);

            $delivery->update([
                'status' => $response->successful() ? 'delivered' : 'failed',
                'response_code' => $response->status(),
                'response_body' => substr($response->body(), 0, 1000),
            ]);

            if (! $response->successful()) {
                $this->fail('Webhook delivery failed with status '.$response->status());
            }
        } catch (\Throwable $e) {
            $delivery->update([
                'status' => 'failed',
                'response_body' => $e->getMessage(),
                'next_retry_at' => now()->addMinutes(pow(2, $this->attempts())),
            ]);
            throw $e;
        }
    }

    public function backoff(): array
    {
        return [60, 300, 900, 3600, 7200];
    }
}
