<?php

namespace App\Http\Controllers\Api;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ReportController
{
    public function activityLog(Request $request)
    {
        return response()->json(
            ActivityLog::query()->with('user')->latest()->limit(50)->get()->map(fn ($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'module' => $log->module,
                'user' => $log->user?->name,
                'meta' => $log->meta ?? [],
                'created_at' => $log->created_at?->toISOString(),
            ])
        );
    }
}
