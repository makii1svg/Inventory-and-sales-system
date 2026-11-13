<?php

namespace App\Http\Controllers\Api;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController
{
    public function index(Request $request)
    {
        return response()->json(
            Expense::query()->latest('incurred_on')->get()->map(fn ($expense) => [
                'id' => $expense->id,
                'title' => $expense->title,
                'category' => $expense->category,
                'amount' => (float) $expense->amount,
                'date' => $expense->incurred_on?->format('Y-m-d'),
                'status' => $expense->status,
            ])
        );
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $user->hasPermission('expenses.manage')) {
            abort(403, 'You are not allowed to manage expenses.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0'],
            'status' => ['nullable', 'string', 'in:pending,approved,review'],
            'incurred_on' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $expense = Expense::query()->create([
            'user_id' => $user->id,
            'title' => $validated['title'],
            'category' => $validated['category'],
            'amount' => $validated['amount'],
            'status' => $validated['status'] ?? 'pending',
            'incurred_on' => $validated['incurred_on'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($expense, 201);
    }
}
