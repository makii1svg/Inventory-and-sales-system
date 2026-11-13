export const alerts = [
  { id: 1, title: 'Low stock on Rice 5kg', source: 'Inventory', severity: 'High', status: 'Unread' },
  { id: 2, title: 'Expiry check due in 3 days', source: 'Stock', severity: 'Medium', status: 'Unread' },
  { id: 3, title: 'Purchase order awaiting receipt', source: 'Purchasing', severity: 'Low', status: 'Read' },
  { id: 4, title: 'Cash drawer variance flagged', source: 'POS', severity: 'High', status: 'Unread' },
]

export const unreadAlertCount = alerts.filter((alert) => alert.status === 'Unread').length
