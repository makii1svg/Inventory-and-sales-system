# API Contract

This backend exposes a REST API for the inventory and sales system. The app uses Laravel Sanctum for session authentication and JSON responses.

## Authentication

### POST /api/auth/login
- Description: Log in an existing user.
- Auth: None
- Body:
  ```json
  {
    "email": "admin@sunrise.local",
    "password": "password"
  }
  ```
- Successful response:
  ```json
  {
    "user": {
      "id": 1,
      "name": "Ariana Cruz",
      "email": "admin@sunrise.local",
      "role": "Admin",
      "permissions": ["*"],
      "status": "active"
    },
    "token": "<plain-text-token>",
    "message": "Login successful."
  }
  ```

### POST /api/auth/logout
- Description: Revoke the authenticated user's tokens.
- Auth: Sanctum token

### GET /api/auth/me
- Description: Return the current authenticated user.
- Auth: Sanctum token

## Core endpoints

### GET /api/settings
- Description: Return current application settings.
- Auth: Optional

### PATCH /api/settings
- Description: Update store details and operational settings.
- Auth: Sanctum token with `settings.manage`
- Body: `store_name`, optional `store_address`, `contact_number`, and `receipt_footer`, plus numeric `monthly_target`, `tax_rate` (0–100), and integer `expiry_warning_days` (0–365).

### GET /api/dashboard
- Description: Return product and alert metrics. Revenue metrics and sales trends are included only for users with `sales.view_all` or `sales.view_own`; own-sale metrics are scoped to that user. Users with `analytics.view` also receive completed-sale profit metrics, optionally filtered with `date_from`, `date_to`, `previous_date_from`, and `previous_date_to`.
- Auth: Sanctum token with `dashboard.view`
- Cashiers do not have dashboard access.

### GET /api/products
- Description: List products with barcode, unit, category, supplier, pricing, stock, and reorder metadata.
- Auth: Sanctum token with `products.view`

### GET /api/pos/products
- Description: List active products needed by the cashier-only point of sale, including unit price and available stock but excluding cost price. Admin and staff users are denied.
- Auth: Sanctum token with `pos.use`

### POST /api/products
- Description: Create a new product and optionally seed initial stock. `unit` is optional and defaults to `unit`; `barcode` may be null.
- Auth: Sanctum token with `products.create`

### PATCH /api/products/{id}
- Description: Update product metadata. Stock quantity must be changed through stock operations.
- Auth: Sanctum token with `products.update`

### GET /api/categories
- Description: List categories.
- Auth: Sanctum token with `categories.manage`

### POST /api/categories
- Description: Create a category. Its slug is generated from the unique category name.
- Body: required `name`; optional `description`.
- Auth: Sanctum token with `categories.manage`

### GET /api/suppliers
- Description: List suppliers.
- Auth: Sanctum token with `suppliers.view`

### POST /api/suppliers
- Description: Create a supplier record.
- Body: required `name`; optional `contact_person`, `email`, `phone`, `address`, and `notes`.
- Auth: Sanctum token with `suppliers.manage`

### GET /api/stock
- Description: Return stock quantity and reorder-level status.
- Auth: Sanctum token with `stock.view`

### GET /api/stock/movements
- Description: Return up to 200 recent stock movements. Each result includes `direction` (`in` or `out`), the movement type, signed quantity, product, user, batch, and reason where available.
- Query filters: optional `product_id`, `movement_type` (including `stock_in` and `stock_out`), `direction` (`in` or `out`), `date_from`, and `date_to`.
- Auth: Sanctum token with `stock.view`

### POST /api/stock/in
- Description: Receive stock directly into a new batch, update the product cost price, record a `stock_in` movement and activity-log event, and resolve low-stock notifications when the reorder threshold is exceeded. The update runs transactionally with the product row locked.
- Body: required `product_id`, positive integer `quantity`, and non-negative `unit_cost`; optional `batch_no`, non-past `expiry_date`, `supplier_id`, and `note`.
- Auth: Sanctum token with `stock.in`

### POST /api/stock/adjustments
- Description: Remove stock for one of the required reason codes: `damaged`, `expired`, `lost`, `internal_use`, `count_correction`, or `other`. `quantity` must be a positive integer; the endpoint always reduces stock and rejects a request that would make stock negative. A free-text `note` is required.
- Auth: Sanctum token with `stock.adjust`
- Compatibility alias: `POST /api/stock-adjustments` has the same behavior and permission.

### GET /api/purchase-orders
- Description: List purchase orders and line items.
- Auth: Sanctum token with `purchases.view`

### POST /api/purchase-orders
- Description: Create a purchase order and receive its items into stock batches while recording stock movements.
- Auth: Sanctum token with both `purchases.create` and `purchases.receive`

### GET /api/transactions
- Description: Sales-list alias with the same role-scoped fields and visibility as `GET /api/sales`.
- Auth: Sanctum token with `sales.view_all`, `sales.view_own`, or `sales.view_limited`

### GET /api/sales
- Description: List all sales for `sales.view_all`; only the authenticated user's sales for `sales.view_own`; or the restricted resource for `sales.view_limited`.
- Full sales items include `unit_cost` and `cost_source` only for users with `analytics.view`.
- Auth: Sanctum token with one of those permissions
- Cashiers cannot access sales history; `pos.use` only permits checkout and printing their own receipt.

### GET /api/sales/{id}
- Description: Return a single sale using the same scope and resource shape as `GET /api/sales`. Users with `sales.view_own` cannot access another user's sale.
- Auth: Sanctum token with `sales.view_all`, `sales.view_own`, or `sales.view_limited`

### POST /api/sales
- Description: Create a sale, record each item's cost from consumed stock batches (or current product cost when batch cost is unavailable), reduce product stock, and log the stock movement. Client-supplied `unit_cost` and `cost_source` are rejected.
- Auth: Cashier-only Sanctum token with `pos.use`; admin and staff users are denied.

### GET /api/sales/{id}/receipt
- Description: Return a printable receipt. `pos.use` is limited to the authenticated user's own sale; `sales.view_all` may print any sale.
- Auth: Sanctum token with `pos.use` for own sales or `sales.view_all` for any sale
- Staff receipts use the restricted no-money resource; cashier and admin receipts include the sale's payment amount fields.

### POST /api/sales/{id}/void
- Description: Void a sale and return its quantities to stock.
- Auth: Sanctum token with `sales.void` (admin-only by default)

### GET /api/analytics
- Description: Return completed-sale revenue, cost of goods sold, gross profit, net profit, margins, estimated-cost share, daily profit trend, revenue by category, and top products by profit. Optional `date_from`, `date_to`, `previous_date_from`, and `previous_date_to` filters use sale date for sales and incurred date for expenses. `net_sales` is not returned.
- Auth: Sanctum token with `analytics.view`

### `php artisan sales:backfill-costs`
- Description: For sale items with a missing or zero `unit_cost`, copy the product's current `cost_price` and mark `cost_source` as `estimated`. Prints the number of updated rows and is safe to run repeatedly; previously estimated rows are not changed.
- Run after applying database migrations to label legacy sale costs.

### GET /api/reports
- Description: Return a report catalog including a profit-and-loss summary based on completed sales and expenses. Optional `date_from` and `date_to` filters use sale date for sales and incurred date for expenses.
- Auth: Sanctum token with `reports.view`

### GET /api/expenses
- Description: List expense records with status and totals.
- Auth: Sanctum token with `expenses.view`

### POST /api/expenses
- Description: Create an expense record for operations or utilities.
- Auth: Sanctum token with `expenses.manage`

### GET /api/users
- Description: List users and their roles and permissions.
- Auth: Sanctum token with `users.view`

### POST /api/users
- Description: Create a user and assign an existing role.
- Body: required `name`, unique `email`, password of at least 8 characters, and role name.
- Auth: Sanctum token with `users.manage`

### PATCH /api/users/{id}
- Description: Set a user's status to `active` or `inactive`.
- Auth: Sanctum token with `users.manage`

### GET /api/roles
- Description: List roles and permission metadata.
- Auth: Sanctum token with `roles.view`

### GET /api/permission-matrix
- Description: Return permission groups and role entries. The `Optional for staff` group contains only `sales.view_limited`; `pos.use` is cashier-only. The admin role entry is marked non-editable.
- Auth: Sanctum token with `roles.view`

### PATCH /api/roles/{role-id}/permissions
- Description: Toggle only the optional `sales.view_limited` permission on the staff role. `pos.use` is not an optional staff permission. Required staff permissions cannot be removed, and the admin role cannot be edited.
- Auth: Sanctum token with `roles.manage`

### GET /api/activity-log
- Description: Return recent activity log events.
- Auth: Sanctum token with `reports.view`

## Security notes
- All protected routes require Sanctum auth.
- Role and permission checks are enforced server-side. See [PERMISSIONS.md](./PERMISSIONS.md) for role defaults and resource scopes.
- Staff without sales permissions receive no revenue, profit, or sales totals from the dashboard, analytics, or report endpoints; analytics and report endpoints are denied.
- POS product listing and checkout are cashier-only; admin and staff accounts are denied even if a legacy role record contains `pos.use`.
- Limited sales responses contain only receipt number, date, time, cashier name, status, and product name/quantity items.
- Purchase payment and cancellation permissions are reserved for administrators; there are no payment or cancellation API endpoints yet.
- Stock movement writes are wrapped in a database transaction and use row-level locking to prevent overselling and inventory drift.
