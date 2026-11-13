import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../lib/api'

function hasRolePermission(role, permission) {
  return role.permissions?.includes('*') || role.permissions?.includes(permission)
}

export default function RolesPermissionsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['permission-matrix'],
    queryFn: async () => (await apiClient.get('/api/permission-matrix')).data,
  })
  const updateStaffPermissions = useMutation({
    mutationFn: ({ roleId, optionalPermissions }) => apiClient.patch(`/api/roles/${roleId}/permissions`, {
      optional_permissions: optionalPermissions,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permission-matrix'] }),
  })

  const roles = data?.roles ?? []

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Roles and permissions</h2>
        <p className="text-sm text-slate-500">The admin role has every permission and cannot be edited.</p>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load the permission matrix.</p> : null}
      {updateStaffPermissions.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not update optional staff permissions.</p> : null}
      {isLoading ? <p className="text-sm text-slate-500">Loading permissions...</p> : null}
      {data ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Permission</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-4 py-3 font-medium">
                    <span className="block">{role.display_name}</span>
                    {role.name === 'admin' ? <span className="text-xs text-slate-500">Read-only</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.groups.map((group) => (
                <FragmentGroup
                  key={group.name}
                  group={group}
                  roles={roles}
                  disabled={updateStaffPermissions.isPending}
                  onOptionalPermissionChange={(role, permission, enabled) => {
                    const optionalPermissions = new Set(role.optional_permissions ?? [])
                    if (enabled) optionalPermissions.add(permission)
                    else optionalPermissions.delete(permission)
                    updateStaffPermissions.mutate({
                      roleId: role.id,
                      optionalPermissions: Array.from(optionalPermissions),
                    })
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

function FragmentGroup({ group, roles, disabled, onOptionalPermissionChange }) {
  const isOptionalStaffGroup = group.name === 'Optional for staff'

  return (
    <>
      <tr className="bg-slate-50">
        <th colSpan={roles.length + 1} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          {group.name}
        </th>
      </tr>
      {group.permissions.map((permission) => (
        <tr key={permission} className="border-t border-slate-100">
          <td className="px-4 py-3 font-mono text-xs text-slate-700">{permission}</td>
          {roles.map((role) => (
            <td key={role.id} className="px-4 py-3 text-slate-700">
                {isOptionalStaffGroup && role.name === 'staff' && role.editable ? (
                  <input
                    type="checkbox"
                    checked={role.optional_permissions?.includes(permission) ?? false}
                    onChange={(event) => onOptionalPermissionChange(role, permission, event.target.checked)}
                    disabled={disabled}
                    aria-label={`${permission} for staff`}
                  />
                ) : hasRolePermission(role, permission) ? 'Yes' : '—'}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
