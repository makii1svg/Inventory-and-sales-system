import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Barcode, DollarSign, Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'

import { Button, FormField, Modal, SelectInput, TextInput } from '../components/shared/ui'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../lib/api'

const quickTender = [100, 200, 500, 1000]

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function POSPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isStaff = String(user?.role).toLowerCase() === 'staff'
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [heldCart, setHeldCart] = useState([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [tendered, setTendered] = useState(0)
  const [lastSale, setLastSale] = useState(null)
  const [printError, setPrintError] = useState('')
  const searchRef = useRef(null)
  const productsQuery = useQuery({
    queryKey: ['pos-products'],
    queryFn: async () => (await apiClient.get('/api/pos/products')).data,
  })
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await apiClient.get('/api/settings')).data,
  })
  const saleMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/api/sales', payload),
    onSuccess: (response) => {
      setLastSale(response.data)
      setCart([])
      setPaymentOpen(false)
      setTendered(0)
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const taxRate = Number(settingsQuery.data?.tax_rate ?? 12)
  const categories = ['All', ...new Set(products.map((product) => product.category).filter(Boolean))]
  const productList = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category
      const matchesSearch = !query
        || [product.name, product.sku, product.barcode].some((value) => String(value ?? '').toLowerCase().includes(query))
      return matchesCategory && matchesSearch
    })
  }, [category, products, search])

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const tax = subtotal * taxRate / 100
  const total = subtotal + tax
  const change = Math.max(tendered - total, 0)

  useEffect(() => {
    function handleShortcuts(event) {
      if (event.key === 'F2') {
        event.preventDefault()
        searchRef.current?.focus()
      } else if (event.key === 'F9') {
        event.preventDefault()
        if (cart.length) setPaymentOpen(true)
      } else if (event.key === 'Escape' && paymentOpen) {
        setPaymentOpen(false)
      }
    }

    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [cart.length, paymentOpen])

  function addToCart(product) {
    if (Number(product.stock_quantity) <= 0) return
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= Number(product.stock_quantity)) return current
        return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function updateQty(productId, delta) {
    setCart((current) => current
      .map((item) => {
        if (item.id !== productId) return item
        const product = products.find((entry) => entry.id === productId)
        const quantity = Math.min(Number(product?.stock_quantity ?? 0), Math.max(0, item.quantity + delta))
        return { ...item, quantity }
      })
      .filter((item) => item.quantity > 0))
  }

  function toggleHold() {
    if (cart.length) {
      setHeldCart(cart)
      setCart([])
    } else if (heldCart.length) {
      setCart(heldCart)
      setHeldCart([])
    }
  }

  function confirmSale() {
    saleMutation.mutate({
      payment_method: paymentMethod,
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    })
  }

  function printReceipt() {
    if (!lastSale) return
    const popup = window.open('', '_blank')
    if (!popup) {
      setPrintError('Allow pop-ups to print the receipt.')
      return
    }

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character])
    const pricesAllowed = !isStaff && lastSale.total_amount != null
    const itemRows = (lastSale.items ?? []).map((item) => `
      <tr>
        <td>${escapeHtml(item.product)}</td>
        <td class="number">${escapeHtml(item.quantity)}</td>
        ${pricesAllowed ? `<td class="number">${formatCurrency(item.unit_price)}</td><td class="number">${formatCurrency(item.line_total)}</td>` : ''}
      </tr>`).join('')

    popup.document.open()
    popup.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>${escapeHtml(lastSale.receipt_number ?? 'Receipt')}</title>
      <style>
        body{font:14px Arial,sans-serif;max-width:680px;margin:32px auto;padding:0 20px;color:#172033}
        h1{font-size:20px;margin-bottom:4px}p{margin:6px 0;color:#526078}
        table{width:100%;border-collapse:collapse;margin:24px 0}
        th,td{text-align:left;padding:9px 5px;border-bottom:1px solid #e6eaf2}
        .number{text-align:right}.total{font-size:18px;font-weight:bold;text-align:right}
        @media print{body{margin:0 auto}}
      </style></head><body>
      <h1>Receipt ${escapeHtml(lastSale.receipt_number ?? lastSale.invoice_number)}</h1>
      <p>${escapeHtml(lastSale.date)} ${escapeHtml(lastSale.time)} · ${escapeHtml(lastSale.cashier ?? lastSale.user)}</p>
      <p>Status: ${escapeHtml(lastSale.status)}</p>
      <table><thead><tr><th>Item</th><th class="number">Qty</th>${pricesAllowed ? '<th class="number">Unit price</th><th class="number">Total</th>' : ''}</tr></thead>
      <tbody>${itemRows}</tbody></table>
      ${pricesAllowed ? `<p class="total">Total: ${formatCurrency(lastSale.total_amount)}</p><p>Payment: ${escapeHtml(lastSale.payment_method)}</p>` : ''}
      </body></html>`)
    popup.document.close()
    popup.focus()
    window.setTimeout(() => popup.print(), 300)
    setPrintError('')
  }

  return (
    <div className="space-y-5">
      {productsQuery.error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {productsQuery.error?.response?.data?.message ?? 'Could not load products for the point of sale.'}
        </p>
      ) : null}
      <div className="grid min-h-[calc(100dvh-18rem)] grid-cols-1 gap-4 pb-[48dvh] lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.95fr)] lg:pb-0">
        <section className="flex min-h-[32rem] flex-col overflow-hidden rounded-xl border border-[#E6EAF2] bg-white p-4 shadow-soft lg:h-[calc(100dvh-16rem)] lg:min-h-[36rem]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search barcode or product" className="pl-9" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <Barcode className="h-4 w-4" />
              Scan a barcode to search
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`min-h-9 rounded-full px-3 text-xs font-medium transition-colors ${category === item ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pb-3 text-[11px] text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">F2: Search</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">F9: Pay</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">Esc: Close</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {productsQuery.isLoading ? <p className="p-4 text-sm text-slate-500">Loading products…</p> : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {productList.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={Number(product.stock_quantity) <= 0}
                    className={`rounded-xl border border-[#E6EAF2] p-3 text-left transition-colors ${Number(product.stock_quantity) <= 0 ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-white hover:border-primary hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{product.name}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${Number(product.stock_quantity) <= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {Number(product.stock_quantity) <= 0 ? 'Out of stock' : `${product.stock_quantity} in stock`}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{product.sku}</p>
                    {!isStaff ? <p className="mt-3 text-base font-semibold text-slate-900 tabular-nums">{formatCurrency(product.unit_price)}</p> : null}
                  </button>
                ))}
                {!productList.length && !productsQuery.isLoading ? <p className="col-span-full p-4 text-center text-sm text-slate-500">No products match this search.</p> : null}
              </div>
            )}
          </div>
        </section>

        <aside className="fixed inset-x-0 bottom-0 z-30 flex max-h-[48dvh] flex-col rounded-t-xl border border-[#E6EAF2] bg-white p-4 shadow-xl lg:static lg:z-auto lg:h-[calc(100dvh-16rem)] lg:min-h-[36rem] lg:max-h-none lg:rounded-xl lg:shadow-soft">
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Cart</h2>
            <div className="flex items-center gap-3">
              {heldCart.length ? <span className="text-xs text-amber-700">1 held cart</span> : null}
              <button type="button" onClick={() => setCart([])} disabled={!cart.length} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {cart.length ? cart.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#E6EAF2] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {!isStaff ? <p className="text-sm text-slate-500">{formatCurrency(item.unit_price)} each</p> : null}
                  </div>
                  {!isStaff ? <p className="font-semibold text-slate-900">{formatCurrency(item.unit_price * item.quantity)}</p> : null}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => updateQty(item.id, -1)} className="rounded-md border border-slate-200 p-2 text-slate-600">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-medium text-slate-800">{item.quantity}</span>
                    <button type="button" aria-label={`Increase ${item.name}`} disabled={item.quantity >= Number(item.stock_quantity)} onClick={() => updateQty(item.id, 1)} className="rounded-md border border-slate-200 p-2 text-slate-600 disabled:opacity-50">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button type="button" onClick={() => updateQty(item.id, -item.quantity)} className="text-sm text-red-600">Remove</button>
                </div>
              </div>
            )) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">{heldCart.length ? 'Cart is empty. Recall your held cart.' : 'Cart is empty'}</p>}
          </div>

          {!isStaff ? (
            <div className="mt-3 shrink-0 space-y-2 border-t border-[#EEF1F6] bg-white pt-3 text-sm text-slate-700">
              <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center justify-between"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex items-center justify-between text-[26px] font-semibold leading-8 text-slate-900 tabular-nums"><span className="text-sm font-medium">Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          ) : null}

          <div className="mt-3 flex shrink-0 gap-3 border-t border-[#EEF1F6] bg-white pt-3">
            <Button type="button" variant="secondary" onClick={toggleHold} disabled={!cart.length && !heldCart.length} className="min-h-11 flex-1">
              {cart.length ? 'Hold' : 'Recall held cart'}
            </Button>
            <Button type="button" onClick={() => setPaymentOpen(true)} disabled={!cart.length || productsQuery.isLoading} className="min-h-11 flex-1 gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              Pay
            </Button>
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-[#E6EAF2] bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Receipt preview</h3>
            <p className="text-sm text-slate-500">{lastSale ? `Receipt ${lastSale.receipt_number ?? lastSale.invoice_number}` : 'A receipt is available after completing a sale.'}</p>
          </div>
          <Button type="button" variant="secondary" disabled={!lastSale} onClick={printReceipt}>Print receipt</Button>
        </div>
        {printError ? <p role="alert" className="mt-3 text-sm text-red-600">{printError}</p> : null}

        {lastSale ? (
          <div className="mt-4 max-w-[320px] rounded-lg border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-700">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">Sunrise Market</p>
              <p>{lastSale.date} {lastSale.time}</p>
              <p>Receipt #{lastSale.receipt_number ?? lastSale.invoice_number}</p>
            </div>
            <div className="mt-3 border-t border-dashed border-slate-300 pt-3">
              {(lastSale.items ?? []).map((item, index) => (
                <div key={`${item.product_id ?? item.product}-${index}`} className="mb-1 flex justify-between gap-2">
                  <span>{item.product} x{item.quantity}</span>
                  {!isStaff && item.line_total != null ? <span>{formatCurrency(item.line_total)}</span> : null}
                </div>
              ))}
            </div>
            {!isStaff && lastSale.total_amount != null ? (
              <div className="mt-3 border-t border-dashed border-slate-300 pt-3 font-bold text-slate-900">
                <div className="flex justify-between"><span>Total</span><span>{formatCurrency(lastSale.total_amount)}</span></div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <Modal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        title="Payment"
        description="Complete the transaction with the selected tender method."
        footer={(
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)} type="button">Cancel</Button>
            <Button type="button" disabled={!cart.length || saleMutation.isPending || (paymentMethod === 'cash' && !isStaff && tendered < total)} onClick={confirmSale}>
              {saleMutation.isPending ? 'Processing...' : 'Confirm sale'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          {saleMutation.error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {saleMutation.error?.response?.data?.message ?? 'Could not complete the sale.'}
            </p>
          ) : null}
          <FormField label="Payment method">
            <SelectInput value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
            </SelectInput>
          </FormField>

          {!isStaff && paymentMethod === 'cash' ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {quickTender.map((amount) => (
                  <button key={amount} type="button" onClick={() => setTendered(amount)} className="min-h-12 rounded-lg border border-[#E6EAF2] bg-white px-3 py-2 text-[26px] font-semibold leading-8 text-slate-800 tabular-nums hover:bg-slate-50">
                    ₱{amount}
                  </button>
                ))}
              </div>
              <FormField label="Cash received">
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <TextInput type="number" min={total} value={tendered} onChange={(event) => setTendered(Number(event.target.value) || 0)} className="pl-9" />
                </div>
              </FormField>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Change</p>
                <p className="mt-2 text-[26px] font-semibold leading-8 text-slate-900 tabular-nums">{formatCurrency(change)}</p>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
