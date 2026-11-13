<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Product;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\User;
use App\Notifications\LowStockNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function adjustStock(
        int $productId,
        int $quantity,
        string $movementType,
        ?int $userId,
        ?string $reference = null,
        ?string $notes = null,
        ?string $reasonCode = null,
    ): Product
    {
        return DB::transaction(function () use ($productId, $quantity, $movementType, $userId, $reference, $notes, $reasonCode) {
            $product = Product::query()->whereKey($productId)->lockForUpdate()->firstOrFail();
            $this->ensureBatchBalance($product);

            $nextQuantity = (int) $product->stock_quantity + (int) $quantity;

            if ($nextQuantity < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Insufficient stock for {$product->name}.",
                ]);
            }

            $batch = null;

            if ($quantity > 0) {
                $batch = $this->createBatch(
                    $product,
                    $quantity,
                    (float) $product->cost_price,
                    $reference,
                );
            } elseif ($quantity < 0) {
                $this->consumeBatches($product, abs($quantity));
            }

            $product->stock_quantity = $nextQuantity;
            $product->save();

            StockMovement::query()->create([
                'product_id' => $product->id,
                'batch_id' => $batch?->id,
                'user_id' => $userId,
                'movement_type' => $movementType,
                'reason_code' => $reasonCode,
                'quantity' => (int) $quantity,
                'reference' => $reference,
                'notes' => $notes,
            ]);

            $this->syncLowStockNotifications($product);

            return $product->fresh();
        });
    }

    public function stockIn(
        int $productId,
        int $quantity,
        float $unitCost,
        ?int $userId,
        ?string $batchNo = null,
        ?string $expiryDate = null,
        ?int $supplierId = null,
        ?string $note = null,
        string $movementType = 'stock_in',
    ): Product {
        if ($quantity < 1) {
            throw ValidationException::withMessages([
                'quantity' => 'Stock-in quantity must be greater than zero.',
            ]);
        }

        return DB::transaction(function () use ($productId, $quantity, $unitCost, $userId, $batchNo, $expiryDate, $supplierId, $note, $movementType) {
            $product = Product::query()->whereKey($productId)->lockForUpdate()->firstOrFail();
            $this->ensureBatchBalance($product);

            $batch = $this->createBatch($product, $quantity, $unitCost, $batchNo, $supplierId, $expiryDate);
            $product->stock_quantity = (int) $product->stock_quantity + $quantity;
            $product->cost_price = $unitCost;
            $product->save();

            StockMovement::query()->create([
                'product_id' => $product->id,
                'batch_id' => $batch->id,
                'user_id' => $userId,
                'movement_type' => $movementType,
                'quantity' => $quantity,
                'reference' => $batchNo,
                'notes' => $note,
            ]);

            ActivityLog::query()->create([
                'user_id' => $userId,
                'action' => 'stock_in',
                'module' => 'stock',
                'meta' => [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'batch_id' => $batch->id,
                    'batch_no' => $batch->batch_no,
                    'quantity' => $quantity,
                ],
            ]);

            $this->syncLowStockNotifications($product);

            return $product->fresh();
        });
    }

    private function createBatch(
        Product $product,
        int $quantity,
        float $unitCost,
        ?string $batchNo,
        ?int $supplierId = null,
        ?string $expiryDate = null,
    ): StockBatch {
        return StockBatch::query()->create([
            'product_id' => $product->id,
            'supplier_id' => $supplierId,
            'batch_no' => $batchNo,
            'unit_cost' => $unitCost,
            'quantity_received' => $quantity,
            'quantity_on_hand' => $quantity,
            'expiry_date' => $expiryDate,
        ]);
    }

    private function ensureBatchBalance(Product $product): void
    {
        $batchQuantity = (int) StockBatch::query()
            ->where('product_id', $product->id)
            ->sum('quantity_on_hand');
        $productQuantity = (int) $product->stock_quantity;

        if ($batchQuantity > $productQuantity) {
            throw new \LogicException("Batch quantities exceed on-hand stock for {$product->name}.");
        }

        if ($batchQuantity < $productQuantity) {
            $missingQuantity = $productQuantity - $batchQuantity;
            $this->createBatch(
                $product,
                $missingQuantity,
                (float) $product->cost_price,
                'OPENING-'.$product->id.'-'.now()->format('YmdHisv'),
            );
        }
    }

    private function consumeBatches(Product $product, int $quantity): void
    {
        $remaining = $quantity;
        $batches = StockBatch::query()
            ->where('product_id', $product->id)
            ->where('quantity_on_hand', '>', 0)
            ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expiry_date')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($batches as $batch) {
            $deduction = min($remaining, (int) $batch->quantity_on_hand);
            $batch->quantity_on_hand -= $deduction;
            $batch->save();
            $remaining -= $deduction;

            if ($remaining === 0) {
                break;
            }
        }

        if ($remaining > 0) {
            throw ValidationException::withMessages([
                'quantity' => "Insufficient batch stock for {$product->name}.",
            ]);
        }
    }

    private function syncLowStockNotifications(Product $product): void
    {
        if ((int) $product->stock_quantity <= (int) $product->reorder_level) {
            $recipients = User::query()
                ->where('status', 'active')
                ->whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'staff']))
                ->get();

            foreach ($recipients as $recipient) {
                $hasOpenNotification = $recipient->notifications()
                    ->where('type', LowStockNotification::class)
                    ->whereNull('read_at')
                    ->where('data->product_id', $product->id)
                    ->exists();

                if (! $hasOpenNotification) {
                    $recipient->notify(new LowStockNotification($product));
                }
            }

            return;
        }

        DB::table('notifications')
            ->where('type', LowStockNotification::class)
            ->whereNull('read_at')
            ->where('data->product_id', $product->id)
            ->update([
                'read_at' => now(),
                'updated_at' => now(),
            ]);
    }
}
