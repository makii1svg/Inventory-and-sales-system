<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentSequence extends Model
{
    protected $fillable = ['document_type', 'prefix', 'last_number'];

    public static function incrementFor(string $documentType, ?string $prefix = null): string
    {
        $record = static::query()->firstOrCreate(
            ['document_type' => $documentType],
            [
                'prefix' => strtoupper((string) ($prefix ?: substr($documentType, 0, 3))),
                'last_number' => 0,
            ],
        );

        $record->increment('last_number');

        return $record->prefix . '-' . str_pad((string) $record->last_number, 6, '0', STR_PAD_LEFT);
    }
}
