import { useMemo, useState } from 'react'
import { Barcode, DollarSign, Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'

import { Button, FormField, Modal, SelectInput, TextInput } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'

const productCatalog = [
  { id: 1, name: 'Rice 5kg', sku: 'PRD-205', category: 'Dry goods', price: 210, stock: 34 },
  { id: 2, name: 'Fresh Tomato', sku: 'PRD-102', category: 'Produce', price: 54, stock: 142 },
  { id: 3, name: 'Chicken Drumsticks', sku: 'PRD-330', category: 'Meat', price: 180, stock: 28 },
  { id: 4, name: 'Milk', sku: 'PRD-118', category: 'Dairy', price: 78, stock: 12 },
  { id: 5, name: 'Banana', sku: 'PRD-119', category: 'Produce', price: 42, stock: 61 },
  { id: 6, name: 'Eggs', sku: 'PRD-440', category: 'Dairy', price: 96, stock: 64 },
]

const quickTender = [100, 200, 500, 1000]

export default function POSPage() {
  const { user } = useAuth()
  const isStaff = String(user?.role).toLowerCase() === 'staff'
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([
    { id: 1, name: 'Rice 5kg', price: 210, qty: 2 },
    { id: 2, name: 'Fresh Tomato', price: 54, qty: 3 },
  ])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [tendered, setTendered] = useState(500)

  const categories = ['All', 'Dry goods', 'Produce', 'Meat', 'Dairy']

  const productList = useMemo(() => {
    const query = search.trim().toLowerCase()
    return productCatalog.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category
      const matchesSearch = !query || item.name.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [category, search])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tax = subtotal * 0.12
  const total = subtotal + tax
  const change = Math.max(tendered - total, 0)

  function updateQty(id, delta) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0),
    )
  }

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
      }
      return [...current, { ...product, qty: 1 }]
    })
  }

  function clearCart() {
    setCart([])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">POS</h2>
          <p className="text-sm text-slate-500">Counter sales and quick checkout.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-1">F2: Search</span>
          <span className="rounded-full bg-slate-100 px-2 py-1">F9: Pay</span>
          <span className="rounded-full bg-slate-100 px-2 py-1">Esc: Close</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by barcode or product" className="pl-9" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Barcode className="h-4 w-4" />
              Scanner ready
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={['rounded-full px-3 py-1.5 text-sm font-medium transition-colors', category === item ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700']}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {productList.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={['rounded-xl border p-3 text-left transition-colors', product.stock <= 0 ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-200 bg-slate-50 hover:border-primary hover:bg-white']}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{product.name}</span>
                  <span className={['rounded-full px-2 py-1 text-[10px] font-semibold', product.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700']}>
                    {product.stock <= 0 ? 'Out of stock' : `${product.stock} in stock`}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{product.sku}</p>
                {!isStaff ? <p className="mt-4 text-lg font-semibold text-slate-900">₱{product.price}</p> : null}
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Cart</h3>
            <button type="button" onClick={clearCart} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>

          <div className="space-y-3">
            {cart.length ? cart.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {!isStaff ? <p className="text-sm text-slate-500">₱{item.price} each</p> : null}
                  </div>
                  {!isStaff ? <p className="font-semibold text-slate-900">₱{item.price * item.qty}</p> : null}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQty(item.id, -1)} className="rounded-md border border-slate-200 p-2 text-slate-600">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-medium text-slate-800">{item.qty}</span>
                    <button type="button" onClick={() => updateQty(item.id, 1)} className="rounded-md border border-slate-200 p-2 text-slate-600">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button type="button" onClick={() => updateQty(item.id, -item.qty)} className="text-sm text-red-600">Remove</button>
                </div>
              </div>
            )) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Cart is empty</p>}
          </div>

          {!isStaff ? (
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-700">
              <div className="flex items-center justify-between"><span>Subtotal</span><span>₱{subtotal}</span></div>
              <div className="flex items-center justify-between"><span>Tax</span><span>₱{tax.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-900"><span>Total</span><span>₱{total.toFixed(2)}</span></div>
            </div>
          ) : null}

          <div className="mt-5 flex gap-3">
            <button type="button" className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">Hold</button>
            <Button type="button" onClick={() => setPaymentOpen(true)} className="flex-1 gap-2">
              <ShoppingCart className="h-4 w-4" />
              Checkout
            </Button>
          </div>
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Receipt preview</h3>
            <p className="text-sm text-slate-500">80mm thermal printer format</p>
          </div>
          <Button type="button" variant="secondary">Print receipt</Button>
        </div>

        <div className="mt-4 max-w-[320px] rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-700">
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">Sunrise Market</p>
            <p>12 Sampaguita St.</p>
            <p>Receipt #R-10248</p>
          </div>
          <div className="mt-3 border-t border-dashed border-slate-300 pt-3">
            {cart.map((item) => (
              <div key={item.id} className="mb-1 flex justify-between gap-2">
                <span>{item.name} x{item.qty}</span>
                {!isStaff ? <span>₱{item.price * item.qty}</span> : null}
              </div>
            ))}
          </div>
          {!isStaff ? (
            <div className="mt-3 border-t border-dashed border-slate-300 pt-3 space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>₱{subtotal}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>₱{tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-slate-900"><span>Total</span><span>₱{total.toFixed(2)}</span></div>
            </div>
          ) : null}
        </div>
      </section>

      <Modal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        title="Payment"
        description="Complete the transaction with the selected tender method."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)} type="button">Cancel</Button>
            <Button type="button">Confirm sale</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Payment method">
            <SelectInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="card">Card</option>
            </SelectInput>
          </FormField>

          {!isStaff ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {quickTender.map((amount) => (
                  <button key={amount} type="button" onClick={() => setTendered(amount)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    ₱{amount}
                  </button>
                ))}
              </div>

              <FormField label="Cash received">
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput type="number" value={tendered} onChange={(event) => setTendered(Number(event.target.value) || 0)} className="pl-9" />
                </div>
              </FormField>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Change</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">₱{change.toFixed(2)}</p>
              </div>
            </>
          ) : null}

          {paymentMethod !== 'cash' && (
            <FormField label="Reference number">
              <TextInput placeholder="Reference or receipt number" />
            </FormField>
          )}
        </div>
      </Modal>
    </div>
  )
}
