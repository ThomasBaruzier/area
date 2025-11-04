# Area - frontend user guide

This document presents the user-facing part of the Area web application.
It describes navigation, rendering, and how to use the web interface as an end user.

---

## Accessing the application

1. Open the application:
    - The default local address is `http://localhost:5173` when running locally. Otherwise, access the deployment URL provided to you.

2. Home page:
    - You will land on the homepage.

---

## Interface navigation

The Area interface is mainly composed of a navigation bar and several main pages.

### 1. Navigation bar (header)

- A bar at the top of the screen provides access to the main sections of the site.
- The displayed tabs vary according to your login status and role.
- Tab examples:
    - Home: The application homepage.
    - Workflows: A list of your automations.
    - Services: Management of connected services.
    - Users: User management (visible only to administrators).
    - Login: Appears if you are not logged in.

- On the right:
    - A button to change between light and dark themes.
    - If you are logged in, your avatar (displaying your initial) is shown with a menu to log out.

### 2. Main pages

- Home: The application's home view.
- Workflows: This page, available once you are logged in, lets you view and manage your workflows (automations).
- Services: A list and management hub for external services connected to your account.
- Users: An admin-only page (see below).
- Login/Register: Authentication screens if you are not yet logged in.

### 3. Authentication

- Login:
    - Click on "Login" in the navigation bar.
    - Enter your credentials.
- Logout:
    - Click on your avatar (top right), then on "Logout".

### 4. Admin access

- If your account has the `ADMIN` role, a "Users" tab appears in the navigation bar.
- This tab provides access to the user management page.

---

## Visual experience

- Light/Dark Theme:
    - Use the theme button to change the interface's appearance.
    - The preference is saved.

- Responsive:
    - The navigation adapts to mobile devices, using a hamburger menu.

- Accessibility:
    - Buttons and menus are keyboard accessible.
    - ARIA labels are present for screen readers.

---

## User journey summary

1. Open the application.
2. Navigate using the top bar.
3. Log in via the "Login" page.
4. Access your workflows, services, or (if you are an admin) user management.
5. Use the avatar menu to log out.
6. Change the theme at any time.

---

## For developers

For more technical details, see the following documents:
- [Authentication](./authentication.md)
- [Main UI components](./components.md)
- [Routing and route protection](./routing.md)
- [API calls](./api-fetching.md)

---
