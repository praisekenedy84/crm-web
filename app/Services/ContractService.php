<?php

namespace App\Services;

use App\Enums\ContractStatus;
use App\Models\Contract;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class ContractService
{
    private const RENEWAL_REMINDER_DAYS = [14, 7, 1];

    public function __construct(
        private readonly AutomationEngine $automationEngine,
        private readonly MessagingProvider $messagingProvider,
    ) {}

    public function expireContracts(): int
    {
        $expired = Contract::query()
            ->where('end_date', '<', now()->toDateString())
            ->whereIn('status', [ContractStatus::Active, ContractStatus::PendingRenewal])
            ->get();

        foreach ($expired as $contract) {
            $contract->update(['status' => ContractStatus::Expired]);
            $this->automationEngine->dispatch('contract.expired', $contract);
            AuditService::log('contract.expired', $contract);
        }

        return $expired->count();
    }

    public function sendRenewalReminders(): int
    {
        $sent = 0;

        foreach (self::RENEWAL_REMINDER_DAYS as $days) {
            $targetDate = now()->addDays($days)->toDateString();

            $contracts = Contract::query()
                ->with(['contact', 'service', 'party'])
                ->whereDate('end_date', $targetDate)
                ->whereIn('status', [ContractStatus::Active, ContractStatus::PendingRenewal])
                ->get();

            foreach ($contracts as $contract) {
                $this->automationEngine->dispatch('contract.renewal_reminder', $contract);

                $phone = $contract->contact?->phone ?? $contract->party?->phone;
                $message = sprintf(
                    'Reminder: your %s contract expires in %d day(s) on %s.',
                    $contract->service?->name ?? 'service',
                    $days,
                    Carbon::parse($contract->end_date)->toFormattedDateString(),
                );

                if ($phone) {
                    $this->messagingProvider->send($phone, $message);
                }

                Task::create([
                    'title' => "Contract renewal due in {$days} day(s)",
                    'description' => $message,
                    'due_date' => $contract->end_date,
                    'priority' => $days <= 7 ? 'high' : 'medium',
                    'assignee_id' => $contract->created_by ?? Auth::id(),
                    'related_type' => $contract->getMorphClass(),
                    'related_id' => $contract->id,
                ]);

                $sent++;
            }
        }

        return $sent;
    }

    public function create(array $data): Contract
    {
        $data['created_by'] ??= Auth::id();
        $data['status'] ??= ContractStatus::Active;

        $contract = Contract::create($data);

        AuditService::log('contract.created', $contract);
        $this->automationEngine->dispatch('contract.created', $contract);

        return $contract;
    }
}
