function normalizePermission(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function hasPermission(user, requiredPermissions = []) {
  if (!user) return false

  const permissions = new Set((user.permissions ?? []).map(normalizePermission))
  const role = normalizePermission(user.role)

  if (permissions.has('*') || role === 'admin' || role === 'administrator') return true
  if (!requiredPermissions.length) return true

  return requiredPermissions.some((permission) => permissions.has(normalizePermission(permission)))
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
