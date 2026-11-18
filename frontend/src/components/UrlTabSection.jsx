import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { canAccessTab } from '../lib/permissions'
import ForbiddenPage from '../pages/ForbiddenPage'
import { PageHeader, TabsList } from './shared/ui'

export default function UrlTabSection({ tabs, sectionSubtitle }) {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const visibleTabs = tabs.filter((tab) => canAccessTab(user, tab))
  const requestedTab = searchParams.get('tab')
  const defaultTab = visibleTabs[0]?.value
  const selectedTab = requestedTab ?? defaultTab
  const activeTab = tabs.find((tab) => tab.value === selectedTab)

  useEffect(() => {
    if (!requestedTab && defaultTab) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('tab', defaultTab)
      setSearchParams(nextParams, { replace: true })
    }
  }, [defaultTab, requestedTab, searchParams, setSearchParams])

  if (!activeTab || !canAccessTab(user, activeTab)) {
    return <ForbiddenPage />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeTab.label}
        subtitle={activeTab.subtitle ?? sectionSubtitle}
        showDateRange={false}
      />
      <TabsList
        value={activeTab.value}
        onValueChange={(value) => {
          const nextParams = new URLSearchParams(searchParams)
          nextParams.set('tab', value)
          setSearchParams(nextParams)
        }}
        items={visibleTabs.map(({ label, value }) => ({ label, value }))}
      />
      {activeTab.content}
    </div>
  )
}
