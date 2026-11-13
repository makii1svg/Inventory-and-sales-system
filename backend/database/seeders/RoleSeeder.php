<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $existingStaffPermissions = Role::query()->where('name', 'staff')->first()?->permissions ?? [];
        $roles = [
            [
                'name' => 'admin',
                'display_name' => 'Admin',
                'permissions' => Role::defaultPermissions('admin'),
            ],
            [
                'name' => 'cashier',
                'display_name' => 'Cashier',
                'permissions' => Role::defaultPermissions('cashier'),
            ],
            [
                'name' => 'staff',
                'display_name' => 'Staff',
                'permissions' => array_values(array_unique([
                    ...Role::defaultPermissions('staff'),
                    ...array_intersect($existingStaffPermissions, Role::OPTIONAL_STAFF_PERMISSIONS),
                ])),
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['name' => $role['name']], $role);
        }

        $roleMigrations = [
            'administrator' => 'admin',
            'manager' => 'staff',
        ];

        foreach (Role::query()->whereIn('name', array_keys($roleMigrations))->with('users')->get() as $legacyRole) {
            $targetRole = Role::query()->where('name', $roleMigrations[$legacyRole->name])->firstOrFail();

            foreach ($legacyRole->users as $user) {
                $targetRole->users()->syncWithoutDetaching([$user->id]);
                $user->forceFill(['role' => $targetRole->display_name])->save();
            }

            $legacyRole->delete();
        }
    }
}
