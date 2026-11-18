import UrlTabSection from '../components/UrlTabSection'
import PurchaseOrdersPage from './PurchaseOrdersPage'
import SuppliersPage from './SuppliersPage'

const tabs = [
  { label: 'Suppliers', value: 'suppliers', subtitle: 'Supplier directory and contact information.', permission: 'suppliers.view', content: <SuppliersPage /> },
  { label: 'Purchase orders', value: 'purchase-orders', subtitle: 'Create orders and receive their items into stock.', permission: 'purchases.view', content: <PurchaseOrdersPage /> },
]

export default function PurchasingSectionPage() {
  return <UrlTabSection tabs={tabs} />
}
