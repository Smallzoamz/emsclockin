# Spec: Super Zoom Map Zone Editor & Dynamic Zones

## 1. Goal
Provide a highly precise, interactive full-canvas zoomable map zone editor inside the Doctor Rules "Medical Fees" (ค่ารักษาพยาบาล) panel, enabling admins to draw detailed polygons (50+ points), drag existing vertices, select/delete specific vertices, create new custom zones dynamically, and select a fallback zone for coordinates that fall outside any defined polygons.

## 2. Dynamic Zone Schema (Supabase `doctor_rules`)
We will expand the existing `medical_fees` category rules structure inside `system_settings.doctor_rules` in a fully backward-compatible way.
- **`zones`**: `{ [zoneName: string]: string }` - Maps zone name to polygon points string.
- **`pins`**: `{ [zoneName: string]: { x: number, y: number } }` - Maps zone name to pin coordinate object `{ x, y }`.
- **`zone_colors`**: `{ [zoneName: string]: string }` - Maps zone name to a theme color key (`red`, `yellow`, `green`, `blue`, `purple`, `pink`, `orange`, `cyan`).
- **`fallback_zone`**: `string` - The name of the zone that serves as the default fallback for click coordinates falling outside any defined zone.

Default/Fallback mappings:
- If a zone doesn't have a color, it defaults to:
  - "ในเมือง" -> `red`
  - "นอกเมือง" -> `yellow`
  - "เมืองบน" -> `green`
  - Any new zone -> `blue`

## 3. Proposed Changes

### A. Core SVG Scaling & Mismatch Fix
- Add `preserveAspectRatio="none"` to the `<svg>` overlay container.
- Update coordinate calculations inside `handleMapClick` to correctly scale clicks to the viewBox boundary `(0 0 100 133.3)` linearly, matching the stretched SVG exactly.

### B. Full-Canvas Zoom & Panning Workspace
- Implement Zoom controls (`+`, `-`, `Reset`) with state variable `zoomScale` (ranging from `1` to `3`, i.e., 100% to 300%).
- Place the map image and SVG overlay inside a container that scales using `transform: scale(zoomScale)` and supports scroll overflow so the admin can pan by scrolling naturally.

### C. Drag-and-Drop Vertices & Multi-Node Editor
- Render vertices as SVG `<circle>` elements with cursor-move pointers.
- Implement mouse drag events (`onMouseDown`, `onMouseMove`, `onMouseUp`) to update the selected vertex coordinate relative to the SVG canvas.
- Highlight the selected vertex and display coordinates/order.
- Support selecting a vertex by clicking it, and deleting it using a "Delete Point" button in the panel or double-clicking it.

### D. Dynamic Zone Management Panel (Create & Delete Zones)
- Add a management list in the edit panel displaying all active zones.
- Add an "Add Zone" input form to register a new zone name and color.
- Add a "Delete Zone" button for custom zones (guarded with a confirmation dialog).
- Add a "Fallback Zone" dropdown selector to pick which zone coordinates outside of polygons fall back to.

### E. Click-to-Identify Map Feature (Read-Only Mode)
- Implement a ray-casting point-in-polygon algorithm in JS.
- When any user clicks the map in read-only mode, calculate if the coordinate falls inside any active zone. If so, highlight it. If not, default to the `fallback_zone` (if selected), highlight the fallback zone, and display a temporary highlight ring where they clicked.

## 4. Verification Plan
- **Aspect Ratio Verification**: Upload maps of different dimensions (e.g., 1:1 square, 16:9 widescreen) and verify that clicked coordinates align 100% under the mouse cursor.
- **Node Modification**: Add a zone, click 10+ points, select node #5, drag it to a new location, delete node #8, and verify the SVG path updates correctly in real-time.
- **Dynamic Fee Linkage**: Hovering a new row in the fees table containing a custom zone name should highlight its custom polygon on the map.
