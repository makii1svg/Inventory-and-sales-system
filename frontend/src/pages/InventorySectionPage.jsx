import UrlTabSection from '../components/UrlTabSection'
import AlertsPage from './AlertsPage'
import CategoriesPage from './CategoriesPage'
import ProductsPage from './ProductsPage'
import StockPage from './StockPage'

const tabs = [
  { label: 'Products', value: 'products', subtitle: 'Monitor inventory, categories, and suppliers.', permission: 'products.view', content: <ProductsPage /> },
  { label: 'Categories', value: 'categories', subtitle: 'Organize products by category.', permission: 'categories.manage', content: <CategoriesPage /> },
  { label: 'Stock levels', value: 'stock-levels', subtitle: 'Track on-hand inventory and reorder thresholds.', permission: 'stock.view', content: <StockPage view="levels" /> },
  {
    label: 'Stock in and out',
    value: 'stock-in-out',
    subtitle: 'Review movements and record reason-coded adjustments.',
    allPermissions: ['stock.view', 'stock.in', 'stock.adjust'],
    content: <StockPage view="movements" />,
  },
  {
    label: 'Expiry and alerts',
    value: 'expiry-alerts',
    subtitle: 'Review expiring stock and operational notifications.',
    allPermissions: ['stock.view', 'notifications.view'],
    content: <AlertsPage />,
  },
]

export default function InventorySectionPage() {
  return <UrlTabSection tabs={tabs} />
}
