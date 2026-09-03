<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ApiKey;
use App\Models\AutomationRule;
use App\Models\EmailTemplate;
use App\Models\LeadScoreRule;
use App\Models\Territory;
use App\Models\Webhook;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('SettingsPage', [
            'automationRules' => AutomationRule::query()->latest()->get(['id', 'name']),
            'webhooks' => Webhook::query()->latest()->get(['id', 'url']),
            'emailTemplates' => EmailTemplate::query()->latest()->get(['id', 'name']),
            'territories' => Territory::query()->latest()->get(['id', 'name']),
            'leadScoreRules' => LeadScoreRule::query()->latest()->get(['id', 'name', 'points']),
            'apiKeys' => ApiKey::query()->latest()->get(['id', 'name', 'key_prefix']),
        ]);
    }
}
