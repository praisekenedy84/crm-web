<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Lead;
use App\Services\AreaImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class ImportExportController extends Controller
{
    public function exportContacts(): JsonResponse
    {
        $contacts = Contact::with(['account.area.parent.parent.parent', 'area.parent.parent.parent'])->get();

        return response()->json(['data' => $contacts]);
    }

    public function exportAccounts(): JsonResponse
    {
        return response()->json(['data' => Account::with('area.parent.parent.parent')->get()]);
    }

    public function importContacts(Request $request): JsonResponse
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
                'account_id' => $record['account_id'] ?? null,
                'area_id' => $record['area_id'] ?? null,
            ]);
            $imported++;
        }

        return response()->json(['imported' => $imported]);
    }

    public function importLeads(Request $request): JsonResponse
    {
        $request->validate([
            'records' => ['required', 'array'],
            'records.*.first_name' => ['required', 'string'],
            'records.*.last_name' => ['required', 'string'],
        ]);

        $imported = 0;
        foreach ($request->input('records') as $record) {
            Lead::create([
                'first_name' => $record['first_name'],
                'last_name' => $record['last_name'],
                'email' => $record['email'] ?? null,
                'phone' => $record['phone'] ?? null,
                'company' => $record['company'] ?? null,
                'source' => $record['source'] ?? null,
                'campaign' => $record['campaign'] ?? null,
            ]);
            $imported++;
        }

        return response()->json(['imported' => $imported]);
    }

    public function importAreas(Request $request, AreaImportService $areaImportService): JsonResponse
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1', 'max:1000'],
            'records.*.region' => ['required', 'string', 'max:255'],
            'records.*.district' => ['nullable', 'string', 'max:255'],
            'records.*.ward' => ['nullable', 'string', 'max:255'],
            'records.*.street' => ['nullable', 'string', 'max:255'],
        ]);

        return response()->json($areaImportService->import($data['records']));
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
