<?php

namespace App\Console\Commands;

use App\Models\Task;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendTaskReminders extends Command
{
    protected $signature = 'crm:send-task-reminders';
    protected $description = 'Notify assignees about tasks due within 24 hours';

    public function handle(): int
    {
        $tasks = Task::where('status', 'open')
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [now(), now()->addDay()])
            ->with('assignee')
            ->get();

        foreach ($tasks as $task) {
            Log::info("Task reminder: {$task->title} due {$task->due_date} for {$task->assignee?->email}");
        }

        $this->info("Processed {$tasks->count()} task reminders.");

        return self::SUCCESS;
    }
}
