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
            ['name' => 'Davao Grain Traders', 'contact_person' => 'Juan Dela Cruz', 'phone' => '09171234567', 'email' => 'grain@example.com', 'address' => 'Davao City', 'notes' => 'Rice and grains'],
            ['name' => 'Mindanao Canned Goods Supply', 'contact_person' => 'Maria Santos', 'phone' => '09181234567', 'email' => 'canned@example.com', 'address' => 'Davao City', 'notes' => 'Canned goods and condiments'],
            ['name' => 'Southern Beverage Distributors', 'contact_person' => 'Pedro Reyes', 'phone' => '09191234567', 'email' => 'beverage@example.com', 'address' => 'Davao City', 'notes' => 'Drinks'],
            ['name' => 'Fresh Dairy Hub', 'contact_person' => 'Ana Lopez', 'phone' => '09201234567', 'email' => 'dairy@example.com', 'address' => 'Davao City', 'notes' => 'Eggs and dairy'],
            ['name' => 'Metro Snacks Wholesale', 'contact_person' => 'Carlo Garcia', 'phone' => '09211234567', 'email' => 'snacks@example.com', 'address' => 'Davao City', 'notes' => 'Snacks and sweets'],
            ['name' => 'Kalinaw Household Supply', 'contact_person' => 'Liza Ramos', 'phone' => '09221234567', 'email' => 'household@example.com', 'address' => 'Davao City', 'notes' => 'Household and personal care'],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::updateOrCreate(['name' => $supplier['name']], $supplier);
        }
    }
}
