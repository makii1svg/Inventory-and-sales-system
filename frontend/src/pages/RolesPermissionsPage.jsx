import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, ShieldCheck, UsersRound } from 'lucide-react'

import { KpiCard } from '../components/shared/ui'
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
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Roles" value={roles.length.toLocaleString()} icon={UsersRound} trendUnavailable loading={isLoading} footer="Roles in the permission matrix" />
        <KpiCard label="Permission groups" value={(data?.groups ?? []).length.toLocaleString()} icon={ShieldCheck} trendUnavailable loading={isLoading} footer="Grouped by product area" />
        <KpiCard label="Defined permissions" value={(data?.groups ?? []).reduce((count, group) => count + group.permissions.length, 0).toLocaleString()} icon={KeyRound} trendUnavailable loading={isLoading} footer="Admin role remains read-only" />
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load the permission matrix.</p> : null}
      {updateStaffPermissions.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not update optional staff permissions.</p> : null}
      {isLoading ? <p className="text-sm text-slate-500">Loading permissions...</p> : null}
      {data ? (
        <div className="max-h-[70vh] min-h-[20rem] overflow-auto rounded-xl border border-[#E6EAF2] bg-white shadow-soft">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#F8FAFC] text-slate-600">
              <tr>
                <th className="h-11 px-4 text-xs font-medium">Permission</th>
                {roles.map((role) => (
                  <th key={role.id} className="h-11 px-4 text-xs font-medium">
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
        <th colSpan={roles.length + 1} className="h-10 border-b border-[#EEF1F6] px-4 text-left text-xs font-semibold text-slate-500">
          {group.name}
        </th>
      </tr>
      {group.permissions.map((permission) => (
        <tr key={permission} className="border-t border-[#EEF1F6]">
          <td className="h-11 px-4 font-mono text-xs text-slate-700">{permission}</td>
          {roles.map((role) => (
            <td key={role.id} className="h-11 px-4 text-sm text-slate-700">
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
