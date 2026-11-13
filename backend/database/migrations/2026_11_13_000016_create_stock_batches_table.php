<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('batch_no')->nullable();
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->unsignedInteger('quantity_received')->default(0);
            $table->unsignedInteger('quantity_on_hand')->default(0);
            $table->date('expiry_date')->nullable();
            $table->timestamps();
            $table->index(['product_id', 'expiry_date']);
        });

        $now = now();

        foreach (DB::table('products')->where('stock_quantity', '>', 0)->get() as $product) {
            DB::table('stock_batches')->insert([
                'product_id' => $product->id,
                'batch_no' => 'OPENING-'.$product->id,
                'unit_cost' => $product->cost_price,
                'quantity_received' => $product->stock_quantity,
                'quantity_on_hand' => $product->stock_quantity,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_batches');
    }
};
