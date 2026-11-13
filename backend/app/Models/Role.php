<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    public const DEFAULT_PERMISSIONS = [
        'admin' => ['*'],
        'staff' => [
            'dashboard.view',
            'products.view',
            'products.create',
            'products.update',
            'categories.manage',
            'suppliers.view',
            'suppliers.manage',
            'stock.view',
            'stock.adjust',
            'stock.in',
            'purchases.view',
            'purchases.create',
            'purchases.receive',
            'notifications.view',
        ],
        'cashier' => [
            'dashboard.view',
            'pos.use',
            'sales.view_own',
        ],
    ];

    public const OPTIONAL_STAFF_PERMISSIONS = [
        'pos.use',
        'sales.view_limited',
    ];

    public const PERMISSION_GROUPS = [
        'Dashboard' => ['dashboard.view'],
        'Products' => ['products.view', 'products.create', 'products.update', 'products.delete'],
        'Categories' => ['categories.manage'],
        'Suppliers' => ['suppliers.view', 'suppliers.manage'],
        'Stock' => ['stock.view', 'stock.adjust', 'stock.in'],
        'Purchases' => ['purchases.view', 'purchases.create', 'purchases.receive', 'purchases.pay', 'purchases.cancel'],
        'POS and sales' => ['sales.create', 'sales.view_own', 'sales.view_all', 'sales.void'],
        'Optional for staff' => ['pos.use', 'sales.view_limited'],
        'Notifications' => ['notifications.view'],
        'Analytics and reports' => ['analytics.view', 'reports.view'],
        'Administration' => ['users.view', 'users.manage', 'roles.view', 'roles.manage', 'settings.manage', 'expenses.view', 'expenses.manage'],
    ];

    protected $fillable = ['name', 'display_name', 'permissions'];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'role_user');
    }

    public static function defaultPermissions(string $role): array
    {
        return self::DEFAULT_PERMISSIONS[$role] ?? [];
    }

    public static function requiredStaffPermissions(): array
    {
        return self::DEFAULT_PERMISSIONS['staff'];
    }
}
