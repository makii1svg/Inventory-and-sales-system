import UrlTabSection from '../components/UrlTabSection'
import ActivityLogPage from './ActivityLogPage'
import RolesPermissionsPage from './RolesPermissionsPage'
import UsersPage from './UsersPage'

const tabs = [
  { label: 'Users', value: 'users', permission: 'users.view', content: <UsersPage /> },
  { label: 'Roles and permissions', value: 'roles', permission: 'roles.view', content: <RolesPermissionsPage /> },
  { label: 'Activity log', value: 'activity-log', permission: 'reports.view', content: <ActivityLogPage /> },
]

export default function UsersSectionPage() {
  return <UrlTabSection tabs={tabs} />
}
