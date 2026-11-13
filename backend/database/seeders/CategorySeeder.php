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
