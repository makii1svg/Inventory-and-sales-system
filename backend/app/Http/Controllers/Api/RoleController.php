<?php

namespace App\Http\Controllers\Api;

use App\Models\Role;
use Illuminate\Http\Request;

class RoleController
{
    public function matrix()
    {
        return response()->json([
            'groups' => collect(Role::PERMISSION_GROUPS)->map(fn (array $permissions, string $name) => [
                'name' => $name,
                'permissions' => $permissions,
            ])->values(),
            'roles' => Role::query()->orderBy('name')->get()->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'permissions' => $role->permissions ?? [],
                'editable' => $role->name !== 'admin',
                'optional_permissions' => $role->name === 'staff'
                    ? array_values(array_intersect($role->permissions ?? [], Role::OPTIONAL_STAFF_PERMISSIONS))
                    : [],
            ])->values(),
        ]);
    }

    public function updateStaffOptionalPermissions(Request $request, Role $role)
    {
        if ($role->name !== 'staff') {
            abort(403, 'Only optional staff permissions can be changed.');
        }

        $validated = $request->validate([
            'optional_permissions' => ['present', 'array'],
            'optional_permissions.*' => ['required', 'string', 'distinct', 'in:'.implode(',', Role::OPTIONAL_STAFF_PERMISSIONS)],
        ]);

        $role->permissions = array_values(array_unique([
            ...Role::requiredStaffPermissions(),
            ...$validated['optional_permissions'],
        ]));
        $role->save();

        return response()->json([
            'id' => $role->id,
            'name' => $role->name,
            'permissions' => $role->permissions,
            'optional_permissions' => array_values(array_intersect($role->permissions, Role::OPTIONAL_STAFF_PERMISSIONS)),
            'editable' => true,
        ]);
    }
}
