export function getCompletedSales(sales = []) {
  return sales.filter((sale) => String(sale.status).toLowerCase() === 'completed')
}

export function getSaleRevenue(sales = []) {
  return getCompletedSales(sales).reduce((sum, sale) => sum + Number(sale.subtotal ?? 0), 0)
}

export function getSaleCost(sale) {
  return (sale.items ?? []).reduce((sum, item) => (
    sum + Number(item.quantity ?? 0) * Number(item.unit_cost ?? 0)
  ), 0)
}

export function summarizeProfit(sales = [], expenses = []) {
  const completedSales = getCompletedSales(sales)
  const revenue = completedSales.reduce((sum, sale) => sum + Number(sale.subtotal ?? 0), 0)
  let costOfGoodsSold = 0
  let estimatedCostAmount = 0
  let estimatedCostItemsCount = 0

  for (const sale of completedSales) {
    for (const item of sale.items ?? []) {
      const itemCost = Number(item.quantity ?? 0) * Number(item.unit_cost ?? 0)
      costOfGoodsSold += itemCost
      if (item.cost_source === 'estimated') {
        estimatedCostAmount += itemCost
        estimatedCostItemsCount += 1
      }
    }
  }

  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)
  const grossProfit = revenue - costOfGoodsSold
  const netProfit = grossProfit - expenseTotal

  return {
    revenue,
    cost_of_goods_sold: costOfGoodsSold,
    gross_profit: grossProfit,
    expenses: expenseTotal,
    net_profit: netProfit,
    gross_margin: revenue > 0 ? grossProfit / revenue * 100 : 0,
    net_margin: revenue > 0 ? netProfit / revenue * 100 : 0,
    estimated_cost_amount: estimatedCostAmount,
    estimated_cost_share: costOfGoodsSold > 0 ? estimatedCostAmount / costOfGoodsSold * 100 : 0,
    estimated_cost_items_count: estimatedCostItemsCount,
    completed_sales_count: completedSales.length,
  }
}
