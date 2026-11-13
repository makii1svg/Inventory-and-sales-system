import UrlTabSection from '../components/UrlTabSection'
import AlertsPage from './AlertsPage'
import CategoriesPage from './CategoriesPage'
import ProductsPage from './ProductsPage'
import StockPage from './StockPage'

const tabs = [
  { label: 'Products', value: 'products', permission: 'products.view', content: <ProductsPage /> },
  { label: 'Categories', value: 'categories', permission: 'categories.manage', content: <CategoriesPage /> },
  { label: 'Stock levels', value: 'stock-levels', permission: 'stock.view', content: <StockPage view="levels" /> },
  {
    label: 'Stock in and out',
    value: 'stock-in-out',
    allPermissions: ['stock.view', 'stock.in', 'stock.adjust'],
    content: <StockPage view="movements" />,
  },
  {
    label: 'Expiry and alerts',
    value: 'expiry-alerts',
    allPermissions: ['stock.view', 'notifications.view'],
    content: <AlertsPage />,
  },
]

export default function InventorySectionPage() {
  return <UrlTabSection tabs={tabs} />
}
