import UrlTabSection from '../components/UrlTabSection'
import ActivityLogPage from './ActivityLogPage'
import RolesPermissionsPage from './RolesPermissionsPage'
import UsersPage from './UsersPage'

const tabs = [
  { label: 'Users', value: 'users', subtitle: 'Manage access, branch assignment, and account activity.', permission: 'users.view', content: <UsersPage /> },
  { label: 'Roles and permissions', value: 'roles', subtitle: 'The admin role has every permission and cannot be edited.', permission: 'roles.view', content: <RolesPermissionsPage /> },
  { label: 'Activity log', value: 'activity-log', subtitle: 'Review recent changes and actions across the store.', permission: 'reports.view', content: <ActivityLogPage /> },
]

export default function UsersSectionPage() {
  return <UrlTabSection tabs={tabs} />
}
