<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('unit_cost', 12, 2)->default(0)->after('unit_price');
            $table->string('cost_source', 12)->default('recorded')->after('unit_cost');
        });

        $now = now();
        DB::table('settings')->updateOrInsert(
            ['key' => 'sale_cost_tracking_started_at'],
            [
                'value' => json_encode($now->toDateString()),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }

    public function down(): void
    {
        DB::table('settings')->where('key', 'sale_cost_tracking_started_at')->delete();

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['unit_cost', 'cost_source']);
        });
    }
};
