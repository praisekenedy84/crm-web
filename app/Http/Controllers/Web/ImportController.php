<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Web\Concerns\Flashes;
use App\Models\Contact;
use App\Services\AreaImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportController extends Controller
{
    use Flashes;

    public function index(): InertiaResponse
    {
        return Inertia::render('ImportPage');
    }

    public function importContacts(Request $request): RedirectResponse
    {
        $request->validate([
            'records' => ['required', 'array'],
            'records.*.first_name' => ['required', 'string'],
            'records.*.last_name' => ['required', 'string'],
        ]);

        $imported = 0;
        foreach ($request->input('records') as $record) {
            Contact::create([
                'first_name' => $record['first_name'],
                'last_name' => $record['last_name'],
                'email' => $record['email'] ?? null,
                'phone' => $record['phone'] ?? null,
            ]);
            $imported++;
        }

        return $this->saved("Imported {$imported} contacts.");
    }

    public function importAreas(Request $request, AreaImportService $areaImportService): RedirectResponse
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1', 'max:1000'],
            'records.*.region' => ['required', 'string', 'max:255'],
            'records.*.district' => ['nullable', 'string', 'max:255'],
            'records.*.ward' => ['nullable', 'string', 'max:255'],
            'records.*.street' => ['nullable', 'string', 'max:255'],
        ]);

        $result = $areaImportService->import($data['records']);

        return $this->saved("Added {$result['created']} territories from {$result['rows_processed']} CSV rows.");
    }

    public function downloadContactsCsv()
    {
        $contacts = Contact::all();
        $headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone'];
        $rows = $contacts->map(fn ($c) => [$c->id, $c->first_name, $c->last_name, $c->email, $c->phone]);
        $csv = $this->makeCsv([$headers, ...$rows->toArray()]);

        return Response::make($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="contacts.csv"',
        ]);
    }

    public function downloadAreasTemplate()
    {
        $csv = $this->makeCsv([
            ['Region', 'District', 'Ward', 'Street'],
            ['Dar es Salaam', 'Kinondoni', 'Mikocheni', 'Mwai Kibaki Road'],
        ]);

        return Response::make($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="territories-import-template.csv"',
        ]);
    }

    /**
     * @param  array<int, array<int, mixed>>  $rows
     */
    private function makeCsv(array $rows): string
    {
        return collect($rows)
            ->map(fn ($row) => implode(',', array_map(
                fn ($value) => '"'.str_replace('"', '""', (string) $value).'"',
                $row,
            )))
            ->implode("\r\n");
    }
}
