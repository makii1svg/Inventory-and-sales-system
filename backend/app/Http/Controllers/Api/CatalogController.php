<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use App\Models\Product;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class CatalogController
{
    public function products(Request $request)
    {
        return response()->json(
            Product::query()
                ->with(['category', 'supplier'])
                ->orderBy('name')
                ->get()
                ->map(fn ($product) => [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'barcode' => $product->barcode,
                    'unit' => $product->unit,
                    'category' => $product->category?->name,
                    'supplier' => $product->supplier?->name,
                    'unit_price' => (float) $product->unit_price,
                    'cost_price' => (float) $product->cost_price,
                    'stock_quantity' => (int) $product->stock_quantity,
                    'reorder_level' => (int) $product->reorder_level,
                    'is_active' => (bool) $product->is_active,
                ])
                ->values()
        );
    }

    public function posProducts(Request $request)
    {
        return response()->json(
            Product::query()
                ->where('is_active', true)
                ->with('category')
                ->orderBy('name')
                ->get()
                ->map(fn ($product) => [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'barcode' => $product->barcode,
                    'unit' => $product->unit,
                    'category' => $product->category?->name ?? 'Uncategorized',
                    'unit_price' => (float) $product->unit_price,
                    'stock_quantity' => (int) $product->stock_quantity,
                ])
                ->values()
        );
    }

    public function categories(Request $request)
    {
        return response()->json(Category::query()->orderBy('name')->get());
    }

    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);
        $slug = Str::slug($validated['name']);
        Validator::make(['slug' => $slug], ['slug' => ['required', 'unique:categories,slug']])->validate();

        $category = Category::query()->create([
            ...$validated,
            'slug' => $slug,
        ]);

        return response()->json($category, 201);
    }

    public function suppliers(Request $request)
    {
        return response()->json(Supplier::query()->orderBy('name')->get());
    }

    public function storeSupplier(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        return response()->json(Supplier::query()->create($validated), 201);
    }

    public function stock(Request $request)
    {
        return response()->json(
            Product::query()->with('category')->orderBy('stock_quantity')->get()->map(fn ($product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category?->name,
                'stock_quantity' => (int) $product->stock_quantity,
                'reorder_level' => (int) $product->reorder_level,
                'low_stock' => (int) $product->stock_quantity <= (int) $product->reorder_level,
            ])
        );
    }

    public function users(Request $request)
    {
        return response()->json(
            User::query()->with('roles')->orderBy('name')->get()->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status, 
                'permissions' => $user->permissions,
            ])
        );
    }

    public function storeUser(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(array_keys(Role::DEFAULT_PERMISSIONS))],
        ]);
        $role = Role::query()->firstOrCreate([
            'name' => $validated['role'],
        ], [
            'display_name' => ucfirst($validated['role']),
            'permissions' => Role::defaultPermissions($validated['role']),
        ]);
        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role->display_name,
            'status' => 'active',
        ]);
        $user->roles()->attach($role);

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'permissions' => $user->permissions,
        ], 201);
    }

    public function updateUser(Request $request, User $user)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,inactive'],
        ]);
        $user->status = $validated['status'];
        $user->save();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'permissions' => $user->permissions,
        ]);
    }

    public function roles(Request $request)
    {
        return response()->json(Role::query()->orderBy('name')->get()->map(fn ($role) => [
            'id' => $role->id,
            'name' => $role->name,
            'display_name' => $role->display_name,
            'permissions' => $role->permissions ?? [],
            'editable' => $role->name !== 'admin',
        ]));
    }
}
