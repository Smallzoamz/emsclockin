---
name: FiveM EMS Central Clock-in System
description: Premium dark medical portal and operations dashboard for FiveM EMS doctors and citizens
colors:
  primary: "#10b981"
  primary-light: "#25d89f"
  bg-primary: "#060a13"
  bg-secondary: "#0c1220"
  text-primary: "#f1f5f9"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  danger: "#ef4444"
  warning: "#f59e0b"
  info: "#3b82f6"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-light}"
  card:
    backgroundColor: "rgba(15, 23, 42, 0.7)"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: FiveM EMS Central Clock-in System

## 1. Overview

**Creative North Star: "The Sterile Glass Grid (ห้องแก้วปฏิบัติการสุดคลีน)"**

This design system establishes a high-fidelity, dark-medical-themed environment tailored for operations in a FiveM city. The visual theme is reminiscent of a high-tech medical telemetry dashboard. It relies on a deep-blue/black base canvas layered with semi-transparent glassmorphic surfaces, accented by vibrant emerald green indicators and border-glows representing health, active states, and clinical precision.

### Key Characteristics:
- **Clinical High Contrast:** Solid, readable white text overlaid on deep slate-blue fields to optimize readability in dark gaming environments.
- **Dynamic Color Mixing:** Subtle green neon glowing borders (`color-mix` relative to the admin-selected accent tone) instead of hard white or grey borders.
- **Snappy Response Easing:** Transition and motion speed mapped to hardware-accelerated exponential ease-out curves, conveying professional speed.

## 2. Colors

All colors are chosen to reflect the sterile yet active medical theme. Accent colors represent operational status.

### Primary
- **Emerald Pulse** (#10b981): Represents health, active duty, online connectivity, and successful action triggers. Used on main action triggers, active tabs, and highlights.
- **Teal Mint Light** (#25d89f): Used for hover states on primary buttons to provide responsive visual feedback.

### Neutral
- **Sterile Void Background** (#060a13): The deepest canvas backdrop layer simulating a dark, clinical monitor screen.
- **Deep Steel Surface** (#0c1220): The secondary background used for sidebars, cards, and layouts.
- **High-contrast Ink** (#f1f5f9): Soft off-white color for display and body text ensuring clean readability.
- **Muted Slate Ink** (#94a3b8): Used for subheadings and descriptive copy.
- **Faded Charcoal** (#64748b): Used for placeholder text and disabled labels.

### Named Rules
**The Rarity of Glow Rule.** Accent glows (`var(--accent-glow)`) and shadows are used sparingly—only for active buttons, pulsing status indicators, or focused modal panels. If more than 15% of the viewport glows, the interface loses its clinical focus and looks chaotic.

## 3. Typography

**Display Font:** Outfit (with system-ui, sans-serif fallbacks)
**Body Font:** Outfit (with system-ui, sans-serif fallbacks)
**Label/Mono Font:** JetBrains Mono (for clock timers, spreadsheets, and shift logs)

### Hierarchy
- **Display** (Bold 700, clamp(2rem, 5vw, 4.5rem), line-height: 1.1): Used for large hero landing titles and portal welcome headings.
- **Headline** (Semi-Bold 600, 1.5rem, line-height: 1.3): Section-level titles on dashboard views.
- **Title** (Medium 500, 1.1rem, line-height: 1.4): Used on card headings and sub-menu groups.
- **Body** (Regular 400, 1rem, line-height: 1.5): Main body paragraphs. Line lengths are constrained to a max of 75ch.
- **Label** (Medium 500, 0.75rem, letter-spacing: 0.05em): Used for button text, table headers, and badges.

## 4. Elevation

The elevation model relies on translucent layering (glassmorphism) rather than traditional drop shadows. Depth is communicated by nesting darker surfaces inside glow-bordered containers.

### Shadow Vocabulary
- **Neon Glow** (`0 0 20px var(--accent-glow)`): Applied exclusively to active status indicator LEDs, active clock buttons, or highlighted modal cards to represent energy/activation.
- **Card Depth** (`0 4px 24px rgba(0, 0, 0, 0.4)`): Used under dialog backdrops and modals to separate them from the main page view.

### Named Rules
**The Flat-at-Rest Rule.** Buttons, cards, and input panels must remain flat at rest with thin borders. Elevation shadows or scaling triggers only as a response to interactive hover or focus states.

## 5. Components

### Buttons
- **Shape:** Soft-cornered rectangles (8px radius sm).
- **Primary:** Background emerald green, text color dark slate (#000000) for contrast. Internal padding is exactly 10px 20px.
- **Hover / Focus:** Blends color-mix overlays to lighten background and applies a subtle hover scale scale(1.02) with dynamic transition (`cubic-bezier(0.16, 1, 0.3, 1)`).

### Cards / Containers
- **Corner Style:** Rounded-lg (16px).
- **Background:** Semi-transparent slate-blue (`rgba(15, 23, 42, 0.7)`) with `backdrop-filter: blur(12px)`.
- **Border:** Thin solid border-subtle (`color-mix(in srgb, var(--accent) 12%, transparent)`).

### Inputs / Fields
- **Style:** Background dark steel (#0c1220), bordered by subtle border, rounded-sm (8px).
- **Focus:** Border changes to active accent color, with a faint glow effect.

## 6. Do's and Don'ts

### Do:
- **Do** use Outfit as the central font-family across all headers, titles, and body texts.
- **Do** wrap confirmation modal popups inside React Portals mounted directly to document.body to prevent stacking context clipping.
- **Do** animate hover transitions using GPU-friendly exponential curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Do** check text color contrast ratios against dark backgrounds (ensure >= 4.5:1 ratio).

### Don't:
- **Don't** use any em-dashes (`—` or `--`) in UI text, labels, or logs. Use standard parentheses or periods.
- **Don't** apply gradient text decorations or clip-paths to headers.
- **Don't** use side-stripe borders (e.g. `border-left: 4px solid ...`) to highlight active list items or menu tabs. Use clean borders or soft backgrounds.
- **Don't** apply round corners exceeding 24px (`radius-xl`) on standard cards or dialog panels.
