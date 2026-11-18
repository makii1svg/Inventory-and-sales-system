import { useEffect } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { PageHeader, TabsList } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { canAccessTab } from '../lib/permissions'
import ForbiddenPage from './ForbiddenPage'
import POSPage from './POSPage'
import TransactionsPage from './TransactionsPage'

const tabs = [
  { label: 'Sales / POS', value: 'pos', permission: 'pos.use' },
  { label: 'Transaction History', value: 'transactions', permissions: ['sales.view_all', 'sales.view_own', 'sales.view_limited'] },
]

export default function SalesSectionPage({ activeTab }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const visibleTabs = tabs.filter((tab) => canAccessTab(user, tab))
  const requestedTab = searchParams.get('tab')

  useEffect(() => {
    if (!requestedTab) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('tab', activeTab)
      setSearchParams(nextParams, { replace: true })
    }
  }, [activeTab, requestedTab, searchParams, setSearchParams])

  if (!canAccessTab(user, tabs.find((tab) => tab.value === activeTab))) {
    return <ForbiddenPage />
  }

  if (requestedTab && !tabs.some((tab) => tab.value === requestedTab)) {
    return <ForbiddenPage />
  }

  if (requestedTab && requestedTab !== activeTab) {
    return <Navigate to={`/sales/${requestedTab}?tab=${requestedTab}`} replace />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeTab === 'pos' ? 'Sales / POS' : 'Transaction History'}
        subtitle={activeTab === 'pos' ? 'Counter sales and quick checkout.' : 'Review your permitted transaction history.'}
        showDateRange={false}
      />
      <TabsList
        value={activeTab}
        onValueChange={(value) => navigate(`/sales/${value}?tab=${value}`)}
        items={visibleTabs.map(({ label, value }) => ({ label, value }))}
      />
      {activeTab === 'pos' ? <POSPage /> : <TransactionsPage />}
    </div>
  )
}
