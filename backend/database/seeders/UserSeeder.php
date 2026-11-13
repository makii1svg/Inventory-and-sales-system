<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@sunrise.local'],
            ['name' => 'Ariana Cruz', 'password' => Hash::make('password'), 'role' => 'Admin', 'status' => 'active']
        );

        $admin->assignRole('admin');

        $staff = User::firstOrCreate(
            ['email' => 'staff@sunrise.local'],
            ['name' => 'Maria Santos', 'password' => Hash::make('password'), 'role' => 'Staff', 'status' => 'active']
        );

        $staff->assignRole('staff');

        $cashier = User::firstOrCreate(
            ['email' => 'cashier@sunrise.local'],
            ['name' => 'Ken Reyes', 'password' => Hash::make('password'), 'role' => 'Cashier', 'status' => 'active']
        );

        $cashier->assignRole('cashier');
    }
}
