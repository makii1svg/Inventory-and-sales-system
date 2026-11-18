<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'Fresh Produce',
            'Beverages',
            'Dry Goods',
            'Bakery',
            'Household',
            'Wellness',
            'Rice and grains',
            'Canned goods',
            'Noodles and pasta',
            'Dairy and eggs',
            'Condiments and cooking',
            'Snacks and sweets',
            'Household and personal care',
        ] as $name) {
            Category::firstOrCreate([
                'slug' => str($name)->slug()->toString(),
            ], [
                'name' => $name,
                'description' => $name,
            ]);
        }
    }
}
