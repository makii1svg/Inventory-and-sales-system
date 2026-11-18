# Role permissions

The backend is the source of truth for authorization. Every authenticated API route must enforce its permission server-side; hiding a page or control in the frontend is not authorization.

## Default roles

| Role | Default permissions |
| --- | --- |
| `admin` | `*` (every permission). Its matrix row is read-only. |
| `staff` | `dashboard.view`, `products.view`, `products.create`, `products.update`, `categories.manage`, `suppliers.view`, `suppliers.manage`, `stock.view`, `stock.adjust`, `stock.in`, `purchases.view`, `purchases.create`, `purchases.receive`, `notifications.view` |
| `cashier` | `pos.use` |

Only cashiers can use the POS, check out sales, and print receipts for their own sales. Admin and staff accounts cannot use the POS. Staff do not receive product deletion, analytics, reports, sales-history, or sales-total permissions by default. Purchase payment and cancellation permissions are admin-only.

## Optional staff permissions

This is defined in the `Optional for staff` permission-matrix group and is disabled by default:

- `sales.view_limited` — permits the restricted sales-list and detail views described below.

An admin may set the staff role's optional permissions through `PATCH /api/roles/{staff-role-id}/permissions` using an `optional_permissions` array containing only `sales.view_limited`. The role's required default permissions are retained. `pos.use` is not an optional staff permission. The `admin` role cannot be edited; no other role can be changed through this endpoint.

## Sales access and data minimization

- `sales.view_all` permits full sales data for any sale. It is included in `admin` through `*`.
- `sales.view_own` permits full sales data only for sales created by the authenticated user. It is not granted to cashiers.
- `sales.view_limited` permits all sales in a restricted resource containing only receipt number, date, time, cashier name, status, and item product name and quantity. It contains no prices, totals, payment details, change, cost, or profit.
- `pos.use` is cashier-only and permits checkout and receipt printing for the cashier's own sales. It does not grant sales-history access.
- The cashier role is restricted to `pos.use` by the backend, including when a legacy role record still contains broader permissions.
- Admin and staff users are denied POS catalog and checkout access, even if a legacy role record contains `pos.use`.
- `sales.void`, `sales.create` (outside POS), `sales.view_all`, and all administrative permissions are not granted to staff or cashier by default.

Receipt access is separate from sales-history access: `pos.use` permits a cashier to access a receipt for their own sale, while `sales.view_all` permits any sale's receipt. A user with only `sales.view_limited` cannot print receipts. Cashier receipts include the payment amount fields; staff do not have checkout or receipt access.

## Financial-data boundaries

Staff can use the dashboard, but the dashboard omits revenue, sales totals, and sales trends for users without `sales.view_all` or `sales.view_own`. Cashiers cannot access the dashboard. Analytics, reports, and activity-log endpoints require their corresponding analytics/report permissions and are not granted to staff or cashier.

Purchase payments and purchase cancellation are reserved for `purchases.pay` and `purchases.cancel`. These permissions are not included in the staff or cashier defaults; any future endpoints for these actions must be admin-only.

## Matrix API

- `GET /api/permission-matrix` returns permission groups and role entries. Each role entry includes `editable`; the `admin` entry is always `false`.
- `PATCH /api/roles/{role-id}/permissions` is admin-only and accepts only `sales.view_limited` in `optional_permissions` for the `staff` role.
- `GET /api/roles` returns the role list; `admin` is marked non-editable there as well.

