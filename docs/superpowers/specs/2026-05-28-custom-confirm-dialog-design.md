# Custom Confirm Dialog Design Spec

**Date**: 2026-05-28  
**Topic**: Browser Confirm Dialog Replacement (Option A: Centered Glassmorphic Modal)  
**Author**: Sonic  
**Status**: Approved by Boss  

---

## 1. Goal & Context

The application currently relies on native browser `confirm()` dialogs across various dashboard screens (Admin Management, Announcements, Bonus Calculations, Settings, etc.). Browser-native confirmation prompts look generic, do not match the premium dark medical theme, and interrupt user flows in a jarring way.

This design document outlines the transition to a unified custom React-based confirm dialog built using React Context and React Portal. The implementation is based on **Option A: Centered Glassmorphic Modal** (selected and approved by the Boss).

---

## 2. Architecture & Data Flow

We will build a React-context based confirmation provider that handles dialog rendering globally and yields control back to page handlers asynchronously.

### A. Confirmation Context Provider

We will create a new client component at `src/components/ConfirmProvider.tsx`.

```typescript
type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'info' | 'success';
};

type ConfirmContextType = (options: string | ConfirmOptions) => Promise<boolean>;
```

#### State Definition
```typescript
interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'primary' | 'danger' | 'warning' | 'info' | 'success';
  resolve: (value: boolean) => void;
}
```

#### Modal Portal Rendering
To prevent clipping and z-index overlap issues caused by parent container styling (`transform`, `filter`, or `perspective`), the dialog modal will render inside a React Portal attached directly to `document.body`.

```tsx
{state.isOpen && createPortal(
  <div className="confirm-backdrop" onClick={handleCancel}>
    <div className={`confirm-modal variant-${state.variant}`} onClick={e => e.stopPropagation()}>
      <div className="confirm-header">
        <span className="confirm-icon">{getIcon(state.variant)}</span>
        <h3 className="confirm-title">{state.title}</h3>
      </div>
      <p className="confirm-message">{state.message}</p>
      <div className="confirm-actions">
        <button className="btn btn-ghost confirm-btn-cancel" onClick={handleCancel}>
          {state.cancelText}
        </button>
        <button className={`btn confirm-btn-submit variant-${state.variant}`} onClick={handleConfirm}>
          {state.confirmText}
        </button>
      </div>
    </div>
  </div>,
  document.body
)}
```

---

## 3. Visual & CSS Design (`src/app/globals.css`)

We will add styling tokens and classes in `src/app/globals.css` that align with the Dark Medical Premium design system:

* **Backdrop Blur (`.confirm-backdrop`):**
  - Background color: `rgba(4, 7, 15, 0.75)`
  - Backdrop blur filter: `backdrop-filter: blur(12px);`
  - Position: `fixed`, inset `0`, `z-index: 99999` (above everything else).
  - Centered display: `display: flex`, `justify-content: center`, `align-items: center`

* **Card Dialog (`.confirm-modal`):**
  - Dimensions: `width: 90%`, `max-width: 440px`, `padding: 24px`
  - Style: Rounded borders `border-radius: var(--radius-lg)`, background `var(--bg-secondary)`
  - Micro-Animation: Scale-up and fade-in transitions.
    ```css
    @keyframes confirmModalShow {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    ```

* **Color Variants:**
  - **`danger`:** Deep red accent boundaries. Red buttons with red glow shadows. Uses warning icons ⚠️.
  - **`warning`:** Deep orange accents. Uses alert icons 📙 or 🔔.
  - **`success`:** Green theme accents. Uses check icons ✅.
  - **`info` / `primary`:** Cyan/Emerald accents depending on town theme settings. Uses info icons ℹ️.

---

## 4. Proposed Changes & Affected Files

The implementation will cover the following files:

1. **[NEW] [ConfirmProvider.tsx](file:///f:/Clockin/src/components/ConfirmProvider.tsx)**  
   Contains the `ConfirmProvider` wrapper and the `useConfirm` React hook exports.

2. **[MODIFY] [layout.tsx](file:///f:/Clockin/src/app/layout.tsx)**  
   Wraps the global children tree in the client-side `ConfirmProvider` component.

3. **[MODIFY] [globals.css](file:///f:/Clockin/src/app/globals.css)**  
   Appends CSS variables and styling classes for backdrop overlays, modal cards, custom color themes, and fade-in animations.

4. **[MODIFY] [page.tsx (Admin Announcements)](file:///f:/Clockin/src/app/dashboard/admin/announcements/page.tsx)**  
   Replaces `confirm()` with `useConfirm()` when deleting templates, categories, and penalties.

5. **[MODIFY] [page.tsx (Admin Control)](file:///f:/Clockin/src/app/dashboard/admin/page.tsx)**  
   Replaces `confirm()` with `useConfirm()` when syncing nicknames, deleting doctors, or changing active/off-duty statuses.

6. **[MODIFY] [page.tsx (Admin Settings)](file:///f:/Clockin/src/app/dashboard/admin/settings/page.tsx)**  
   Replaces `confirm()` with `useConfirm()` when deleting credentials accounts, deleting Discord admins, or removing custom city logo.

7. **[MODIFY] [page.tsx (User Announcements)](file:///f:/Clockin/src/app/dashboard/announcements/page.tsx)**  
   Replaces `confirm()` with `useConfirm()` when releasing a doctor from blacklist status.

8. **[MODIFY] [page.tsx (Weekly Bonus Sheet)](file:///f:/Clockin/src/app/dashboard/bonus/page.tsx)**  
   Replaces `confirm()` with `useConfirm()` when publishing weekly bonuses and completing manual payouts.

---

## 5. Verification Plan

### Automated Build Checks
- Execute Next.js build compilation (`npm run build`) to ensure zero TypeScript and compiler issues occur with imports.

### Manual Visual Tests
- Verify modal alignment and scale factor on both Desktop and Mobile viewport sizes.
- Verify glassmorphism effect rendering in front of active data grids.
- Confirm click outside backdrop closes modal with a `false` resolved result.
- Confirm clicking Escape key or clicking Cancel button handles safe exit.
- Confirm click on Confirmation button performs the correct action.
