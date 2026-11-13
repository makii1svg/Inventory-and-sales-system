<?php

namespace App\Http\Controllers\Api;

use App\Models\Category;
use App\Models\Product;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\Request;

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

    public function categories(Request $request)
    {
        return response()->json(Category::query()->orderBy('name')->get());
    }

    public function suppliers(Request $request)
    {
        return response()->json(Supplier::query()->orderBy('name')->get());
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
