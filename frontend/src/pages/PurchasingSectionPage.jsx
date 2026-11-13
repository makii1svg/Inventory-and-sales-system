import UrlTabSection from '../components/UrlTabSection'
import PurchaseOrdersPage from './PurchaseOrdersPage'
import SuppliersPage from './SuppliersPage'

const tabs = [
  { label: 'Suppliers', value: 'suppliers', permission: 'suppliers.view', content: <SuppliersPage /> },
  { label: 'Purchase orders', value: 'purchase-orders', permission: 'purchases.view', content: <PurchaseOrdersPage /> },
]

export default function PurchasingSectionPage() {
  return <UrlTabSection tabs={tabs} />
}
