<!-- 1a6f3e45-cff1-47b6-b117-747c4a350c91 9e139141-30ef-4f38-a19e-8f0b28d9e1a3 -->
# Tactical UI Redesign

Transform the Planning Poker UI to match the military/tactical aesthetic shown in the reference screenshots.

## Overview

Update the visual design to a dark tactical theme with military-style color coding while maintaining modern UX expectations. Focus on main game components with reusable, DRY component patterns.

## Implementation Steps

### 1. Theme Foundation - CSS Variables

**File: `web/src/index.css`**

Update CSS custom properties for tactical color palette:

- Deep black background (#0a0a0a / hsl(0 0% 4%))
- Darker card backgrounds (#111111 / hsl(0 0% 7%))
- Tactical accent colors:
- Green: Active/positive states (hsl(142 71% 45%))
- Orange: Tasks/assignments/warnings (hsl(32 95% 44%))
- Red: Hostile/destructive (hsl(0 72% 51%))
- Blue: Toggles/secondary actions (hsl(217 91% 60%))
- Muted text: Gray-green tint (hsl(150 5% 55%))
- Borders: Subtle dark gray (hsl(0 0% 15%))

Add tactical-specific utilities:

- Border glow effects for active states
- Subtle scan-line background pattern (optional, subtle)

### 2. Reusable Components - Panel

**File: `web/src/components/layout/Panel.tsx`**

Refactor for tactical aesthetic:

- Darker backgrounds with subtle borders
- Title bar with uppercase monospace text
- Optional count badge in title (e.g., "HOSTILE 2")
- Optional collapsible functionality
- Variant prop: `default | hostile | task | active`
- Each variant uses appropriate accent color

### 3. Reusable Components - Button

**File: `web/src/components/ui/Button.tsx`**

Add tactical variants:

- `tactical-primary`: Orange background for primary actions
- `tactical-active`: Green for active/confirm states
- `tactical-hostile`: Red for destructive actions
- `tactical-toggle`: Blue toggle-style buttons
- Keep existing variants for backwards compatibility

Add consistent uppercase text and monospace styling

### 4. Reusable Components - Badge

**File: `web/src/components/ui/Badge.tsx`**

Update badge variants to match tactical colors:

- `active`: Green background
- `task`: Orange background
- `hostile`: Red background
- `info`: Blue background

### 5. Game Component - EstimateSelector

**File: `web/src/components/EstimateSelector.tsx`**

Updates:

- Use Panel with "ESTIMATE" title
- Vote buttons styled as tactical toggles (blue accent when active)
- "VOTED" indicator in green with checkmark icon
- Cleaner spacing and alignment

### 6. Game Component - VoteDisplay

**File: `web/src/components/VoteDisplay.tsx`**

Updates:

- Use Panel with "VOTES" title and count
- Individual vote cards with colored dots (green for host, default for others)
- Bar chart with tactical green bars
- Average displayed prominently with tactical styling
- Hidden state shows tactical "CLASSIFIED" or locked indicator

### 7. Game Component - VoteStatus

**File: `web/src/components/VoteStatus.tsx`**

Updates:

- Use Panel with "STATUS" title
- Large vote count display with color coding:
- Green when all voted (100%)
- Orange when ≥50% voted
- Red when <50% voted
- Monospace numbers
- Minimal design

### 8. Game Component - HostControls

**File: `web/src/components/HostControls.tsx`**

Updates:

- Use Panel with "CONTROLS" title
- Buttons use tactical variants:
- "NEXT ISSUE": tactical-primary (orange)
- "REVEAL": tactical-active (green)
- "CLEAR": tactical-primary (orange)
- "STATS": tactical-toggle (blue)
- Uppercase text, icon left alignment

### 9. Game Component - CurrentIssue

**File: `web/src/components/CurrentIssue.tsx`**

Updates:

- Use Panel with "CURRENT ISSUE" title
- Display issue identifier in tactical badge
- Issue text in clear readable format
- Link to Linear (if applicable) with external link icon

### 10. Supporting Components

Update remaining components to maintain consistency:

- **Queue**: Show items with task badges (orange)
- **TacticalFeed**: Already themed well, ensure consistent colors
- **NetworkStatus**: Use green/orange/red indicators for connection quality

## Design Principles

- **Color Coding**: Consistent semantic colors across all components
- Green = Active, Confirmed, Positive
- Orange = Tasks, Actions, Warnings  
- Red = Hostile, Destructive, Critical
- Blue = Toggles, Info, Secondary
- **Typography**: Uppercase labels, monospace for data/counts
- **Spacing**: Tighter, more compact (military aesthetic)
- **Borders**: Subtle, dark, with occasional accent glows
- **Backgrounds**: Deep blacks with subtle variations
- **DRY**: Shared Panel and Button components reduce duplication
- **Modern UX**: Despite tactical look, maintain intuitive interactions

## Notes

- Maintain all existing functionality, only update visuals
- Keep responsive behavior intact
- Preserve accessibility (sufficient contrast ratios)
- Test with dark mode only (tactical theme is inherently dark)

### To-dos

- [ ] Update CSS variables in index.css for tactical color palette and utilities
- [ ] Refactor Panel component with tactical variants and optional features
- [ ] Add tactical button variants (primary, active, hostile, toggle)
- [ ] Update Badge with tactical color variants
- [ ] Update EstimateSelector with tactical styling
- [ ] Update VoteDisplay with tactical styling and colors
- [ ] Update VoteStatus with color-coded status indicators
- [ ] Update HostControls with tactical button variants
- [ ] Update CurrentIssue with tactical styling
- [ ] Update Queue, TacticalFeed, NetworkStatus for consistency