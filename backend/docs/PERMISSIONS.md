# Role permissions

The backend is the source of truth for authorization. Every authenticated API route must enforce its permission server-side; hiding a page or control in the frontend is not authorization.

## Default roles

| Role | Default permissions |
| --- | --- |
| `admin` | `*` (every permission). Its matrix row is read-only. |
| `staff` | `dashboard.view`, `products.view`, `products.create`, `products.update`, `categories.manage`, `suppliers.view`, `suppliers.manage`, `stock.view`, `stock.adjust`, `stock.in`, `purchases.view`, `purchases.create`, `purchases.receive`, `notifications.view` |
| `cashier` | `dashboard.view`, `pos.use`, `sales.view_own` |

Staff do not receive product deletion, analytics, reports, sales-history, or sales-total permissions by default. Purchase payment and cancellation permissions are admin-only.

## Optional staff permissions

These are defined in the `Optional for staff` permission-matrix group and are disabled by default:

- `pos.use` — permits checkout and receipt printing for the staff user's own sales.
- `sales.view_limited` — permits the restricted sales-list and detail views described below.

An admin may set the staff role's optional permissions through `PATCH /api/roles/{staff-role-id}/permissions` using an `optional_permissions` array containing only these names. The role's required default permissions are retained. The `admin` role cannot be edited; no other role can be changed through this endpoint.

## Sales access and data minimization

- `sales.view_all` permits full sales data for any sale. It is included in `admin` through `*`.
- `sales.view_own` permits full sales data only for sales created by the authenticated user. The cashier role has this permission.
- `sales.view_limited` permits all sales in a restricted resource containing only receipt number, date, time, cashier name, status, and item product name and quantity. It contains no prices, totals, payment details, change, cost, or profit.
- `pos.use` permits the user to create sales and print receipts for their own sales. It does not grant sales-history access.
- `sales.void`, `sales.create` (outside POS), `sales.view_all`, and all administrative permissions are not granted to staff or cashier by default.

Receipt access is separate from sales-history access: `pos.use` permits a receipt for the user's own sale, while `sales.view_all` permits any sale's receipt. A user with only `sales.view_limited` cannot print receipts. Staff with optional `pos.use` receive the restricted no-money resource for their checkout result and own receipt; they do not receive sale totals through those responses.

## Financial-data boundaries

Staff can use the dashboard, but the dashboard omits revenue, sales totals, and sales trends for users without `sales.view_all` or `sales.view_own`. Analytics, reports, and activity-log endpoints require their corresponding analytics/report permissions and are not granted to staff or cashier.

Purchase payments and purchase cancellation are reserved for `purchases.pay` and `purchases.cancel`. These permissions are not included in the staff or cashier defaults; any future endpoints for these actions must be admin-only.

## Matrix API

- `GET /api/permission-matrix` returns permission groups and role entries. Each role entry includes `editable`; the `admin` entry is always `false`.
- `PATCH /api/roles/{role-id}/permissions` is admin-only and accepts only `optional_permissions` for the `staff` role.
- `GET /api/roles` returns the role list; `admin` is marked non-editable there as well.

