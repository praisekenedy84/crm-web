<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Project;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectPageController extends Controller
{
    use Flashes;

    public function index(): Response
    {
        return Inertia::render('ProjectsPage', [
            'projects' => Project::with(['manager', 'account', 'deal'])->latest()->paginate(20)->withQueryString(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'string', 'in:planning,active,on_hold,completed,cancelled'],
        ]);

        $data['currency'] = 'TZS';
        $data['status'] ??= 'planning';
        $data['actual_cost'] = 0;

        $project = Project::create($data);
        AuditService::log('created', $project);

        return $this->saved('Project created.');
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'string', 'in:planning,active,on_hold,completed,cancelled'],
        ]);

        $before = $project->only(array_keys($data));
        $project->update($data);
        AuditService::log('updated', $project, ['before' => $before, 'after' => $data]);

        return $this->saved('Project updated.');
    }

    public function destroy(Project $project): RedirectResponse
    {
        AuditService::log('deleted', $project);
        $project->delete();

        return $this->saved('Project deleted.');
    }
}
