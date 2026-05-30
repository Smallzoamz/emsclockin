# Super Zoom Map Zone Editor & Dynamic Zones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, zoomable map zone drawing workspace in the doctor rules view, enabling admins to draw detailed polygons (50+ points), drag existing vertices, select/delete specific vertices, create custom zones dynamically, and select a fallback zone for coordinates that fall outside any defined polygons.

**Architecture:** We will implement React-based inline SVG drawing logic with aspect ratio automatic normalization (`preserveAspectRatio="none"`), dynamic state management stored within the existing Supabase `doctor_rules` table structure, and HTML5 event tracking for vertex drag-and-drop.

**Tech Stack:** Next.js, React, Supabase, CSS Variables, SVG overlay.

---

### Task 1: SVG Layout Mismatch and preserveAspectRatio Fix

**Files:**
- Modify: `src/app/dashboard/rules/page.tsx`

- [ ] **Step 1: Set preserveAspectRatio on SVG overlay**
  In the modal's SVG map overlay, add the `preserveAspectRatio="none"` attribute so that coordinates stretch/scale precisely with the rendered image size.
  
  Code change around line 1343:
  ```tsx
  <svg
    viewBox="0 0 100 133.3"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 10
    }}
  >
  ```

- [ ] **Step 2: Update click coordinate calculation math**
  Modify `handleMapClick` to correctly scale clicked coordinates to the 100 x 133.3 viewBox boundaries linearly, matching the stretched SVG layout.
  
  Code change around line 323:
  ```tsx
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !isEditMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Linearly map click point to viewBox coordinates (0 to 100 for X, 0 to 133.3 for Y)
    const x = Math.round((clickX / rect.width) * 100 * 10) / 10;
    const y = Math.round((clickY / rect.height) * 133.3 * 10) / 10;

    if (drawMode === "polygon") {
      const currentPointsStr = getZonePoints(selectedDrawZone);
      const points = currentPointsStr ? currentPointsStr.split(" ").filter(Boolean) : [];
      points.push(`${x},${y}`);
      updateZonePoints(selectedDrawZone, points.join(" "));
    } else if (drawMode === "pin") {
      updatePinCoords(selectedDrawZone, { x, y });
    }
  };
  ```

- [ ] **Step 3: Verify math works without build errors**
  Run: `npm run build`
  Expected: Production build successfully compiles with 0 type/syntax errors.

---

### Task 2: Dynamic Zone Configuration & Selection State

**Files:**
- Modify: `src/app/dashboard/rules/page.tsx`

- [ ] **Step 1: Implement Dynamic Zone Getter and Setter Helpers**
  Refactor `getZonePoints`, `getPinCoords`, and add `getZoneColor` helpers to dynamically parse the settings rules data, ensuring backwards-compatibility.
  
  Define color mapping:
  ```tsx
  const colorMap: Record<string, { hex: string, name: string, rgb: string }> = {
    red: { hex: "#ef4444", name: "แดง", rgb: "239, 68, 68" },
    yellow: { hex: "#eab308", name: "เหลือง", rgb: "234, 179, 8" },
    green: { hex: "#10b981", name: "เขียว", rgb: "16, 185, 129" },
    blue: { hex: "#3b82f6", name: "น้ำเงิน", rgb: "59, 130, 246" },
    purple: { hex: "#a855f7", name: "ม่วง", rgb: "168, 85, 247" },
    pink: { hex: "#ec4899", name: "ชมพู", rgb: "236, 72, 153" },
    orange: { hex: "#f97316", name: "ส้ม", rgb: "249, 115, 22" },
    cyan: { hex: "#06b6d4", name: "ฟ้า", rgb: "6, 182, 212" }
  };
  ```
  
  Implement the helpers inside `RulesPage`:
  ```tsx
  const getZonePoints = (zoneName: string): string => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    if (medCat?.zones?.[zoneName] !== undefined) {
      return medCat.zones[zoneName];
    }
    return (defaultZones as any)[zoneName] || "";
  };

  const getPinCoords = (zoneName: string): { x: number, y: number } => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    if (medCat?.pins?.[zoneName] !== undefined) {
      return medCat.pins[zoneName];
    }
    return (defaultPins as any)[zoneName] || { x: 50, y: 50 };
  };

  const getZoneColor = (zoneName: string): string => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    if (medCat?.zone_colors?.[zoneName] !== undefined) {
      return medCat.zone_colors[zoneName];
    }
    if (zoneName === "ในเมือง") return "red";
    if (zoneName === "นอกเมือง") return "yellow";
    if (zoneName === "เมืองบน") return "green";
    return "blue";
  };
  ```

- [ ] **Step 2: Rewrite row and polygon hover connection to support dynamic zones**
  Update `getZoneKey(description)` to search for any defined zone key dynamically:
  ```tsx
  const getZoneKey = (desc: string): string | null => {
    if (!desc) return null;
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    const zones = medCat?.zones || defaultZones;
    const zoneNames = Object.keys(zones);
    for (const name of zoneNames) {
      if (desc.includes(name)) {
        return name;
      }
    }
    return null;
  };
  ```
  
  Update `selectedDrawZone` type to generic `string`:
  ```tsx
  const [selectedDrawZone, setSelectedDrawZone] = useState<string>("ในเมือง");
  ```

- [ ] **Step 3: Verify code builds clean**
  Run: `npm run build`
  Expected: Build finishes with no TypeScript errors.

---

### Task 3: Dynamic Zone List & Admin Manager Panel

**Files:**
- Modify: `src/app/dashboard/rules/page.tsx`

- [ ] **Step 1: Add new zone creation and zone deletion state and handler methods**
  Add state for new zone registration form fields inside the component:
  ```tsx
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneColor, setNewZoneColor] = useState("blue");
  ```
  
  Add `handleAddZone` and `handleDeleteZone` methods:
  ```tsx
  const handleAddZone = () => {
    if (!newZoneName.trim() || !editedRules) return;
    const name = newZoneName.trim();
    
    // Check if zone already exists
    const medCat = editedRules.categories.find(c => c.id === "medical_fees") as any;
    if (medCat?.zones?.[name] !== undefined || defaultZones[name as keyof typeof defaultZones]) {
      showToast("พื้นที่นี้มีอยู่แล้วค่ะ", "error");
      return;
    }

    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      const zones = { ...((cat as any).zones || defaultZones), [name]: "" };
      const pins = { ...((cat as any).pins || defaultPins), [name]: { x: 50, y: 50 } };
      const zone_colors = { ...((cat as any).zone_colors || {}), [name]: newZoneColor };
      return { ...cat, zones, pins, zone_colors };
    });

    setEditedRules({ ...editedRules, categories: updatedCategories });
    setSelectedDrawZone(name);
    setNewZoneName("");
    showToast(`เพิ่มพื้นที่ "${name}" สำเร็จแล้วค่ะ`, "success");
  };

  const handleDeleteZone = async (zoneName: string) => {
    const confirmed = await confirm({
      title: "ยืนยันการลบพื้นที่",
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบพื้นที่ "${zoneName}" และพิกัดทั้งหมด?`,
      confirmText: "ลบพื้นที่",
      cancelText: "ยกเลิก",
      variant: "danger"
    });
    if (!confirmed || !editedRules) return;

    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      
      const zones = { ...((cat as any).zones || defaultZones) };
      const pins = { ...((cat as any).pins || defaultPins) };
      const zone_colors = { ...((cat as any).zone_colors || {}) };
      
      delete zones[zoneName];
      delete pins[zoneName];
      delete zone_colors[zoneName];

      return { ...cat, zones, pins, zone_colors };
    });

    setEditedRules({ ...editedRules, categories: updatedCategories });
    
    // Reset selection to another remaining zone
    const remainingZones = Object.keys((updatedCategories.find(c => c.id === "medical_fees") as any).zones);
    setSelectedDrawZone(remainingZones[0] || "");
    showToast(`ลบพื้นที่ "${zoneName}" เรียบร้อยแล้วค่ะ`, "success");
  };
  ```

- [ ] **Step 2: Add Fallback Zone Configuration**
  Add state and handler for fallback zone key:
  ```tsx
  const getFallbackZone = (): string => {
    const activeRulesSource = isEditMode ? editedRules : rules;
    const medCat = activeRulesSource?.categories.find(c => c.id === "medical_fees") as any;
    return medCat?.fallback_zone || "";
  };

  const handleUpdateFallbackZone = (val: string) => {
    if (!editedRules) return;
    const updatedCategories = editedRules.categories.map((cat) => {
      if (cat.id !== "medical_fees") return cat;
      return { ...cat, fallback_zone: val };
    });
    setEditedRules({ ...editedRules, categories: updatedCategories });
  };
  ```

- [ ] **Step 3: Render Zone Manager UI within edit panel**
  Insert the HTML template configuration fields inside the `zone-editor-panel` around line 1561.
  
  Render lists of defined zones, dynamic color selection, new zone forms, and fallback zone selector.

- [ ] **Step 4: Verify layout renders and builds**
  Run: `npm run build`
  Expected: Passed.

---

### Task 4: Full-Canvas Zooming & Panning Workspace

**Files:**
- Modify: `src/app/dashboard/rules/page.tsx`

- [ ] **Step 1: Add Canvas Zoom State**
  Add a state variable for managing canvas zoom scale:
  ```tsx
  const [zoomScale, setZoomScale] = useState(1);
  ```

- [ ] **Step 2: Implement Zoom controls inside the Left Column map title**
  Add `zoomScale` controls (`+`, `-`, `Reset`) next to "แผนที่แบ่งพื้นที่การรักษา".
  ```tsx
  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
    <button 
      type="button" 
      onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
      className="btn" 
      style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
      title="ซูมเข้า"
    >
      ➕ ซูมเข้า
    </button>
    <button 
      type="button" 
      onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 1))}
      className="btn" 
      style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
      title="ซูมออก"
    >
      ➖ ซูมออก
    </button>
    {zoomScale > 1 && (
      <button 
        type="button" 
        onClick={() => setZoomScale(1)}
        className="btn" 
        style={{ padding: "4px 8px", fontSize: "0.7rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
      >
        รีเซ็ต ({zoomScale * 100}%)
      </button>
    )}
  </div>
  ```

- [ ] **Step 3: Wrap map-container in scroll overflow container**
  Update the style of `map-container` (parent of `map-zoom-wrapper`) to ensure it scrolls:
  ```tsx
  <div className="map-container" style={{ position: "relative", overflow: "auto", maxHeight: "400px", width: "100%" }}>
  ```
  
  Update `getMapTransform` to scale based on `zoomScale`:
  ```tsx
  const getMapTransform = () => {
    if (isDrawingMode) {
      return {
        transform: `scale(${zoomScale})`,
        transformOrigin: "top left",
        width: "100%"
      };
    }
    // Read-only dynamic hover panning
    if (hoveredZone === "ในเมือง") {
      return {
        transform: "scale(1.9)",
        transformOrigin: "43% 102%"
      };
    }
    if (hoveredZone === "นอกเมือง") {
      return {
        transform: "scale(1.7)",
        transformOrigin: "50% 67%"
      };
    }
    if (hoveredZone === "เมืองบน") {
      return {
        transform: "scale(1.9)",
        transformOrigin: "50% 33%"
      };
    }
    // Hover custom zone dynamic panning
    if (hoveredZone) {
      const pin = getPinCoords(hoveredZone);
      return {
        transform: "scale(1.8)",
        transformOrigin: `${pin.x}% ${pin.y}%`
      };
    }
    return {
      transform: "scale(1)",
      transformOrigin: "center center"
    };
  };
  ```

- [ ] **Step 4: Verify building compiles**
  Run: `npm run build`
  Expected: Passed.

---

### Task 5: Draggable Vertices (Drag & Drop Node Editor)

**Files:**
- Modify: `src/app/dashboard/rules/page.tsx`

- [ ] **Step 1: Add state for vertex selections and dragging**
  Define states inside `RulesPage`:
  ```tsx
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);
  ```

- [ ] **Step 2: Implement Drag coordinate mapping handler**
  Add a handler when moving mouse over the map container to translate coordinates of the currently dragged vertex.
  ```tsx
  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingMode || draggedVertexIndex === null || !isEditMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const x = Math.min(Math.max(Math.round((clickX / rect.width) * 100 * 10) / 10, 0), 100);
    const y = Math.min(Math.max(Math.round((clickY / rect.height) * 133.3 * 10) / 10, 0), 133.3);

    const currentPointsStr = getZonePoints(selectedDrawZone);
    if (!currentPointsStr) return;
    const points = currentPointsStr.split(" ").filter(Boolean);
    
    if (draggedVertexIndex >= 0 && draggedVertexIndex < points.length) {
      points[draggedVertexIndex] = `${x},${y}`;
      updateZonePoints(selectedDrawZone, points.join(" "));
    }
  };
  ```

- [ ] **Step 3: Modify vertices UI circles rendering**
  Bind dragging/selection mouse listeners onto each vertex `<circle>` element.
  
  Update vertex render block inside the interactive SVG around line 1489:
  ```tsx
  {points.map((pt, idx) => (
    <circle
      key={`vertex-${idx}`}
      cx={pt.x}
      cy={pt.y}
      r={selectedVertexIndex === idx ? "3.2" : "2"}
      className="editor-vertex-point"
      style={{
        fill: selectedVertexIndex === idx ? "#3b82f6" : "#ffffff",
        stroke: selectedVertexIndex === idx ? "#ffffff" : (colorMap[getZoneColor(selectedDrawZone)]?.hex || "#10b981"),
        strokeWidth: selectedVertexIndex === idx ? 1.5 : 1.2,
        cursor: "move",
        pointerEvents: "auto"
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setSelectedVertexIndex(idx);
        setDraggedVertexIndex(idx);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        // Double click shortcut to delete vertex
        handleDeleteVertex(idx);
      }}
      title={`จุดที่ ${idx + 1} (${pt.x}, ${pt.y}) - ดับเบิ้ลคลิกเพื่อลบ`}
    />
  ))}
  ```

- [ ] **Step 4: Implement Delete Vertex method**
  Add helper method inside `RulesPage`:
  ```tsx
  const handleDeleteVertex = (idx: number) => {
    const currentPointsStr = getZonePoints(selectedDrawZone);
    if (!currentPointsStr) return;
    const points = currentPointsStr.split(" ").filter(Boolean);
    if (idx >= 0 && idx < points.length) {
      points.splice(idx, 1);
      updateZonePoints(selectedDrawZone, points.join(" "));
      setSelectedVertexIndex(null);
      setDraggedVertexIndex(null);
    }
  };
  ```

- [ ] **Step 5: Bind document-level mouse up listener**
  Add a `useEffect` inside `RulesPage` to release dragging when mouse button is released outside target:
  ```tsx
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDraggedVertexIndex(null);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);
  ```

- [ ] **Step 6: Render selected point panel & keyboard listeners**
  Add a keyboard listener so pressing `Delete` or `Backspace` deletes the selected node:
  ```tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDrawingMode || selectedVertexIndex === null || isEditMode === false) return;
      // Skip if typing in inputs
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteVertex(selectedVertexIndex);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawingMode, selectedVertexIndex, selectedDrawZone, editedRules]);
  ```

  And render a card in the toolbar to show the selected point coordinates with a delete button.

- [ ] **Step 7: Verify production build**
  Run: `npm run build`
  Expected: Passed.

---

### Task 6: Read-Only Click-to-Identify Map Area & Fallback

**Files:**
- Modify: `src/app/dashboard/rules/page.tsx`

- [ ] **Step 1: Implement Point-In-Polygon math method**
  Add a mathematical helper method in `src/app/dashboard/rules/page.tsx`:
  ```tsx
  const isPointInPolygon = (x: number, y: number, polygonPointsStr: string): boolean => {
    if (!polygonPointsStr) return false;
    const points = polygonPointsStr.split(" ").filter(Boolean).map(pt => {
      const [px, py] = pt.split(",").map(Number);
      return { x: px, y: py };
    });
    if (points.length < 3) return false;

    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;

      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };
  ```

- [ ] **Step 2: Add click mapping to resolve area coordinates**
  Create click state variables:
  ```tsx
  const [clickedCoord, setClickedCoord] = useState<{ x: number, y: number, label: string } | null>(null);
  ```

  Modify click event handler on read-only map around line 1326:
  ```tsx
  onClick={(e) => {
    if (isDrawingMode) {
      handleMapClick(e);
    } else {
      if (isEditMode) return;
      
      // Read-only click identification logic
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const x = Math.round((clickX / rect.width) * 100 * 10) / 10;
      const y = Math.round((clickY / rect.height) * 133.3 * 10) / 10;

      // Find which zone is clicked
      const medCat = rules?.categories.find(c => c.id === "medical_fees") as any;
      const zones = medCat?.zones || defaultZones;
      let matchedZone: string | null = null;
      
      for (const zoneName of Object.keys(zones)) {
        const pointsStr = zones[zoneName];
        if (isPointInPolygon(x, y, pointsStr)) {
          matchedZone = zoneName;
          break;
        }
      }

      if (!matchedZone) {
        matchedZone = medCat?.fallback_zone || null;
      }

      if (matchedZone) {
        setHoveredZone(matchedZone);
        setClickedCoord({ x, y, label: matchedZone });
        // Clear click pin after 5 seconds
        setTimeout(() => setClickedCoord(null), 5000);
      } else {
        setClickedCoord({ x, y, label: "นอกพื้นที่เขตบริการ" });
        setTimeout(() => setClickedCoord(null), 3000);
      }
    }
  }}
  ```

- [ ] **Step 3: Render visual indicators for dynamic zones & clicking pin**
  - Loop and render dynamic SVG zones (`<polygon>`) and pins (`<g>`) using dynamic keys from `Object.keys(medCat?.zones || defaultZones)` instead of hardcoded เมืองบน/นอกเมือง/ในเมือง.
  - Apply custom zone colors on hover using inline style configurations.
  - Render a clicked target point coordinate if `clickedCoord` is active.

- [ ] **Step 4: Verify build compiles cleanly**
  Run: `npm run build`
  Expected: Passed.
