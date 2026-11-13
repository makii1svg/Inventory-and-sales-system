<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'status'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = ['name', 'email', 'password', 'role', 'status'];

    protected $hidden = ['password', 'remember_token'];

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    public function purchases()
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function getPermissionsAttribute(): array
    {
        $permissions = $this->roles->flatMap(fn ($role) => $role->permissions ?? []);

        if ($permissions->contains('*')) {
            return ['*'];
        }

        return $permissions->values()->all();
    }

    public function getRoleAttribute(): string
    {
        $roleName = $this->attributes['role'] ?? null;

        if ($roleName) {
            return $roleName;
        }

        $role = $this->roles()->first();

        return $role?->display_name ?? ucfirst($role?->name ?? 'Cashier');
    }

    public function assignRole(string $name): self
    {
        $role = Role::firstOrCreate([
            'name' => $name,
        ], [
            'display_name' => ucfirst(str_replace('-', ' ', $name)),
            'permissions' => Role::defaultPermissions($name),
        ]);

        $this->roles()->syncWithoutDetaching([$role->id]);
        $this->role = $role->display_name;
        $this->save();

        return $this;
    }

    public function hasPermission(string $permission): bool
    {
        $permissions = $this->permissions;

        return in_array('*', $permissions, true) || in_array($permission, $permissions, true);
    }

    public function hasRole(string $name): bool
    {
        return $this->roles->contains('name', $name);
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'permissions' => $this->permissions,
            'status' => $this->status ?? 'active',
        ];
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => 'string',
        ];
    }

}
