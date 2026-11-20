# INFUT — Design System (`Night Pitch`)

## 1. Visual Identity & Direction
- **Mode:** Operate (Sports Match & Community Management — Mobile-first & Responsive Web)
- **Theme:** **Night Pitch** — Inspired by floodlit nighttime football courts and modern sports performance apps (FotMob, Strava, Nike Run Club).
- **Core Principle:** Precision, scanability, and tactile speed on the court. Zero emoji clutter, zero generic purple/orange SaaS templates, zero nested-card bloat.

## 2. Color System (Semantic Tokens)

### Surface Ramp (Dark Obsidian with Subtle Pitch Undertone)
| Token | Hex / Value | Usage |
|---|---|---|
| `background` | `#070A0D` | App root canvas |
| `surface` | `#0D1217` | Navigation bars, sidebars, recessed trays |
| `card` | `#121820` | Primary elevated content surfaces |
| `surfaceLight` | `#18202B` | Secondary buttons, chips, segmented controls |
| `surfaceElevated` | `#1F2937` | Active hover/pressed surface states |

### Accents & Semantics
| Token | Hex / Value | Contrast Role |
|---|---|---|
| `primary` | `#16D97C` | Floodlight Emerald — primary CTAs, active tabs, confirmed states (text: `#04120B`, >10:1) |
| `primaryLight` | `#34EEA0` | Hover / highlighted primary |
| `primaryDark` | `#0EA860` | Pressed primary |
| `primarySoft` | `rgba(22, 217, 124, 0.12)` | Subtle tinted badges & active nav backgrounds |
| `gold` | `#FBBF24` | Championship Gold — strictly for MVP crowns & #1 rankings |
| `error` / `live` | `#F43F5E` | Matchday Crimson — Live match pulse, declines, destructive actions |
| `warning` | `#F59E0B` | Waitlist, pending payment confirmation |
| `info` | `#38BDF8` | Goalkeeper tags, informational badges |

### Typography Contrast
| Token | Hex | Min Contrast |
|---|---|---|
| `textPrimary` | `#F4F7FA` | >14:1 on `#121820` |
| `textSecondary` | `#B4C0CE` | >8.5:1 on `#121820` |
| `textMuted` | `#7D8B9D` | >4.6:1 on `#0D1217` (WCAG AA) |
| `textInverse` | `#04120B` | >10.5:1 on `#16D97C` |

### Borders
- `border`: `rgba(255, 255, 255, 0.08)`
- `borderStrong`: `rgba(255, 255, 255, 0.15)`
- `borderLight`: `rgba(255, 255, 255, 0.05)`

## 3. Typography
- **Font Family:** `Plus Jakarta Sans` (Web via Google Fonts, System sans fallback on native)
- **Weight Hierarchy:**
  - `800` ExtraBold: Screen titles, scoreboards, timers, primary buttons
  - `700` Bold: Card titles, section headers, active chips
  - `600` SemiBold: Navigation labels, badges, secondary buttons
  - `400` / `500` Regular/Medium: Body copy and metadata
- **Tabular Numerals:** Mandatory (`fontVariant: ['tabular-nums']`) for all scores, timers, player counts, and currency values.

## 4. Spacing, Radii & Touch Targets
- **Spacing Rhythm:** 4px / 8px grid (`xs: 4`, `sm: 8`, `md: 16`, `lg: 24`, `xl: 32`, `xxl: 48`)
- **Border Radius:**
  - Cards: `16px` (`borderRadius.lg`)
  - Modals: `20px–24px` (`borderRadius.xl`)
  - Inputs & Buttons: `12px` (`borderRadius.md`)
  - Chips & Status Pills: `9999px` (`borderRadius.full`)
- **Touch Targets:** Minimum `44x44pt` for all interactive controls.

## 5. Motion & Transitions
- **Press Feedback:** Tactile `ScalePressable` (`0.975` scale, `90ms` ease-out) without shifting layout bounds.
- **Entrances:** `FadeInView` with `240ms` cubic ease-out and `8px` vertical settle (respects Reduced Motion).
- **Live Indicator:** Breathing `PulseDot` (`1400ms` loop) for matches in progress.
- **Navigation:** Smooth stack transitions (`fade_from_bottom` / `slide_from_right`).
