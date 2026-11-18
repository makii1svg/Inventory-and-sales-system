function normalizePermission(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function hasPermission(user, requiredPermissions = []) {
  if (!user) return false

  const permissions = new Set((user.permissions ?? []).map(normalizePermission))
  const role = normalizePermission(user.role)

  if (!requiredPermissions.length) return true

  if (role === 'cashier') {
    return requiredPermissions.some((permission) => normalizePermission(permission) === 'pos.use')
  }

  const cashierOnlyPermissions = new Set(['pos.use', 'sales.create'])
  if (requiredPermissions.some((permission) => cashierOnlyPermissions.has(normalizePermission(permission)))) {
    return false
  }

  if (permissions.has('*') || role === 'admin' || role === 'administrator') return true

  return requiredPermissions.some((permission) => permissions.has(normalizePermission(permission)))
}

export function getHomePath(user) {
  if (hasPermission(user, ['dashboard.view'])) return '/dashboard'
  if (hasPermission(user, ['pos.use'])) return '/sales/pos?tab=pos'
  if (hasPermission(user, ['products.view'])) return '/inventory?tab=products'
  return '/403'
}

export function hasAllPermissions(user, requiredPermissions = []) {
  return requiredPermissions.every((permission) => hasPermission(user, [permission]))
}

export function canAccessTab(user, tab) {
  return tab.allPermissions
    ? hasAllPermissions(user, tab.allPermissions)
    : hasPermission(user, tab.permissions ?? (tab.permission ? [tab.permission] : []))
}

export function isAdmin(user) {
  return hasPermission(user, ['settings.manage'])
}
