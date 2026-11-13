<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            ['name' => 'Green Valley Farms', 'contact_person' => 'Mina Reyes', 'email' => 'mina@greenvalley.ph', 'phone' => '09171234567', 'address' => 'Bacolod'],
            ['name' => 'Prime Distributors', 'contact_person' => 'John Mina', 'email' => 'sales@primedistributors.ph', 'phone' => '09182345678', 'address' => 'Cebu'],
            ['name' => 'Metro Grocery Supply', 'contact_person' => 'Elena Cruz', 'email' => 'hello@metrogrocer.ph', 'phone' => '09293456789', 'address' => 'Davao'],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::firstOrCreate(['name' => $supplier['name']], $supplier);
        }
    }
}
