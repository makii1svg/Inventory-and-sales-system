# Design system

The interface uses a cool, light canvas, white cards, and the existing primary blue, navy, ink, and muted text tokens. Shared presentation primitives live in `frontend/src/components/shared/ui.jsx`.

## Tokens

- Canvas: `#F2F5FA`; surfaces: white.
- Card border: `1px solid #E6EAF2`; radius: `12px`; shadow: `0 1px 2px rgba(16, 24, 40, 0.04)`.
- Card padding: `20px`, reduced to `16px` below `768px`. Controls use an `8px` radius; chips are fully rounded.
- Grid gap: `16px` below `1280px`, `20px` from `1280px`.
- Keep the existing primary blue, navy, ink, and muted colors.
- Use tabular numerals for numeric values.

## Type scale

- KPI value: `26px`, semibold.
- KPI label: `13px`, medium, muted.
- Card title: `14px`, semibold.
- Card subtitle, chart text, and chips: `12px`; chips are medium weight.

## Layout

- Cards are flex columns that fill their grid cell. Their header comes first, body grows with `flex: 1`, and footer is pinned to the bottom with `margin-top: auto`.
- A grid row's cards stretch to the same height. Add useful context or secondary metrics when a card would otherwise feel empty.
- Chart areas are relative, flexing wrappers with a minimum height of `220px`. Responsive charts must receive a non-zero height.
- Empty and loading states keep the card layout and use content-shaped skeletons.
- `DashboardGrid` uses 1 column below `768px`, 6 columns from `768px`, and 12 columns from `1280px`.

## Charts and status

- Chart gridlines and series lines use `#EEF1F6`; previous-period series use `#9DB6EE`.
- Area fills use primary blue at `12%` opacity with no gradient.
- Grouped bars show labels when there are at most 8 categories. Tooltips use navy with white text, target lines are dashed and labeled, legends sit in the chart header, and axes use muted `12px` text without vertical gridlines.
- Delta colors reflect the metric's `goodDirection`: a decrease is positive for a lower-is-better metric and negative for a higher-is-better metric.

## Shared components

`Card`, `KpiCard`, `ChartCard`, `DonutCard`, `RankedList`, `MetricsTable`, `SegmentedBar`, `StatusCard`, `PageHeader`, and `DashboardGrid` are the reusable building blocks. Existing `WidgetCard` and `ChartFrame` exports remain available for current pages.
