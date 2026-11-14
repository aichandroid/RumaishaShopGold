# Design Tokens: Rumaisho Gold (Luxury Gold & Deep Forest Green)

Generated using UI/UX Pro Max Skill for Rumaisho Gold.

## 1. Palette Specification

| Token Name | Hex Code | Role & Usage | WCAG Contrast vs Surface |
| :--- | :--- | :--- | :--- |
| `--brand-primary` | `#123C35` | Deep Forest Green (Sidebar, headings, focus) | > 12:1 (AAA) |
| `--brand-primary-hover`| `#0C2924` | Primary hover state | > 14:1 (AAA) |
| `--brand-gold` | `#C6A15B` | Champagne Gold (Badges, accents, active indicators) | > 4.5:1 (AA against dark) |
| `--brand-gold-light` | `#F4EBD9` | Light Champagne Gold (Pill bg, subtext highlights) | Non-text UI |
| `--brand-gold-subtle` | `rgba(198,161,91,0.12)` | Subtle tinted container background | Non-text UI |
| `--bg-page` | `#F7F7F3` | Warm Ivory / Off-white page canvas | Contrast base |
| `--bg-surface` | `#FFFFFF` | Clean White Card & Table surfaces | Contrast base |
| `--bg-surface-subtle` | `#F1F3EF` | Table header background, pill group container | Non-text UI |
| `--text-primary` | `#1A2421` | High-contrast body & header text | > 12.5:1 (AAA) |
| `--text-secondary` | `#52605A` | Slate-muted secondary labels, table headers | > 5.5:1 (AA) |
| `--text-tertiary` | `#7D8B85` | Captions & subtle hint text | > 3.2:1 |
| `--color-success` | `#0D7A5F` | Emerald green for profit & available stock | > 5.2:1 (AA) |
| `--color-success-bg` | `#E8F7F2` | Tinted background for positive indicators | Non-text UI |
| `--color-warning` | `#B45309` | Amber for pending states & warnings | > 4.8:1 (AA) |
| `--color-danger` | `#DC2626` | Red for errors, deletions, sold status | > 4.6:1 (AA) |
| `--border-subtle` | `#E8ECE6` | Card borders & row dividers | Non-text UI (1.2:1) |
| `--border-medium` | `#D9DFD6` | Input borders & control boundaries | > 3:1 non-text UI |

## 2. Typography Hierarchy

- **Heading & Numeric Font:** `Outfit`, sans-serif (Weights: 600, 700, 800)
  - Geometric, luxurious, high legibility for large Indonesian Rupiah figures (`font-variant-numeric: tabular-nums`).
- **Body & Data Font:** `Inter`, sans-serif (Weights: 400, 500, 600)
  - Ultra-clean for forms, tables, labels, and small mobile viewport text.

## 3. Density & Spacing System (Density Dial: 8/10)

- Spacing base: 4px / 8px rhythm
- `--space-xs`: 4px
- `--space-sm`: 8px
- `--space-md`: 12px
- `--space-lg`: 16px
- `--space-xl`: 24px
- Card padding: `1.25rem 1.35rem` (compact dashboard cards preventing mobile viewport clipping)
- Touch targets: Minimum 44 × 44 CSS pixels on all buttons and interactive controls.

## 4. Responsive Breakpoints

1. **Small Mobile (< 375px):** Single-column dashboard summary cards, compact typography.
2. **Standard Mobile (375px – 640px):** Single-column / dense 2-column grid, fixed bottom navigation bar, topbar with brand thumbnail.
3. **Tablet (641px – 1023px):** 2-column KPI grid, stacked recap/chart grid, bottom navigation bar.
4. **Desktop (>= 1024px):** 250px fixed luxury forest green sidebar, 4-column KPI grid, 1.35:1 recap/chart grid, topbar breadcrumb with live Indonesian date.
