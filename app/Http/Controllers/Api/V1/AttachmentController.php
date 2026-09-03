<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'related_type' => ['required', 'string'],
            'related_id' => ['required', 'integer'],
        ]);

        $attachments = Attachment::where('related_type', $request->related_type)
            ->where('related_id', $request->related_id)
            ->with('uploadedBy')
            ->get();

        return response()->json($attachments);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
            'related_type' => ['required', 'string'],
            'related_id' => ['required', 'integer'],
        ]);

        $file = $request->file('file');
        $path = $file->store('attachments', 'local');

        $attachment = Attachment::create([
            'related_type' => $request->related_type,
            'related_id' => $request->related_id,
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json($attachment->load('uploadedBy'), 201);
    }

    public function download(Attachment $attachment)
    {
        return Storage::disk('local')->download($attachment->file_path, $attachment->file_name);
    }

    public function destroy(Attachment $attachment): JsonResponse
    {
        Storage::disk('local')->delete($attachment->file_path);
        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted.']);
    }
}
