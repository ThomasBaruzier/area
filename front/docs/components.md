# Main components - technical reference

---

## Header.tsx

- This is the global header component.
- It uses `useLocation()` to determine the active route.
- It uses `useAuth()` to adapt the navigation (e.g., showing admin items).
- The navigation is generated with the `PillNav` component.
- Tools on the right include `ThemeButton` and `UserAvatar` (if logged in).

### Behavior
- If `isAuthenticated` and `isAdmin`, the "Users" item (`/admin/users`) is shown.
- If the user is not logged in, the "Login" item (`/login`) is shown.
- Main items include Home, Workflows, and Services.

---

## PillNav

- This is the "pill-style" navigation component.
- Key props: `logo`, `logoAlt`, `items: PillNavItem[]`, `activeHref`, and CSS variables for colors.
- `PillNavItem` type:
    - `{ label: string; href: string; ariaLabel?: string }`
- It uses GSAP for animations.
- It includes mobile support via a hamburger menu.

---

## UserAvatar

- Displays the user's initial or a fallback icon.
- Opens a menu on click, which currently contains a "Logout" option.
- It logs the user out via `useAuth().logout`.
- It gets the initial from the `user` object.

---

## ThemeButton

- Allows toggling between light and dark themes.
- It stores the user's preference in `localStorage`.
- It handles system theme changes.

---

## WorkflowList

- Displays the user's list of workflows.
- Accessible via the "Workflows" tab or the `/workflow/list` route.
- Each workflow is shown as a card or list item.
- It provides access to the workflow detail or edit page.
- It may include quick actions like edit or delete.

---

## CreateWorkflow

- Allows creating a new workflow or editing an existing one.
- Accessible via `/workflow/create` (for creation) or `/workflow/edit/:id` (for editing).
- Typical structure:
    - Service, action, and reaction selection.
    - Configuration forms.
    - A confirm/save button.
- It pre-fills fields when in edit mode.

---

## Accessibility and best practices

- All buttons have an ARIA label.
- Navigation elements are accessible (e.g., using `role="menu"` and `aria-current` on the active item).
---
