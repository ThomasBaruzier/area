# Area project roadmap

This document outlines the development tasks for the AREA platform, tracking completed features and future work.

## Completed features

### Core platform and architecture

- Project scaffolding: Initial setup for Backend (NestJS), Web (React), and Mobile (Android) applications.
- Containerization: Full development environment managed by Docker and Docker Compose.
- Database schema: Initial Prisma schema for core models (User, Service, Workflow, etc.).
- `about.json` endpoint: Public metadata endpoint is implemented as required.
- CI/CD pipeline: A GitHub Actions workflow automatically runs tests and builds for all three applications on every push.

### Backend

- User authentication: Local user registration and login with JWT-based sessions.
- Workflow API: Core CRUD endpoints (`create`, `list`, `update`, `delete`) for workflows.
- Metadata API: Endpoints to list available services, actions, and reactions.
- OAuth2 integration: Backend routes and strategies to handle OAuth2 flows for Google, GitHub, Discord, and Spotify.
- Secure GitHub webhook handler: Endpoint to receive and securely validate webhook events from GitHub using a secret key.
- Google/Gmail webhook handler: Endpoint to receive Google Cloud Pub/Sub notifications for real-time email triggers.
- Discord bot gateway: A Discord bot that connects to the gateway to receive real-time message events.

### Web client

- User authentication: Login and Registration pages.
- Protected routes: Client-side routing that guards authenticated sections.
- Workflow list view: UI to display, toggle, and delete existing workflows.
- Visual workflow builder: Core drag-and-drop interface using ReactFlow for creating and editing workflows.
- Service and action/reaction picker: Modals for selecting services and their components, respecting user connection status.
- Admin panel: A basic administration section on the web client to manage users.

### Mobile client

- MVVM architecture: Project structured with Hilt, ViewModels, Repositories, and Use Cases.
- User authentication: Login, registration, and settings screens.
- Dynamic server URL: Implemented a settings screen to change the backend API URL.
- Workflow management: Screens to list, delete, toggle, and create workflows.
- Service connection: UI to list services and initiate the OAuth2 connection flow.

## To-do list

### High priority

- Encrypt service connection tokens: All sensitive tokens and refresh tokens in the `ServiceConnection` table must be encrypted at rest in the database to mitigate data exposure risks.
- Refactor trigger and reaction logic: The backend's `TriggerService` and `ReactionExecutor` should be refactored from large switch statements to a more scalable Strategy Pattern. This will make adding new services much cleaner.
- Expand mobile test coverage: Add comprehensive unit and UI tests for the mobile client (JUnit, Turbine, Espresso) to ensure its reliability and correctness.

### Medium priority

- Implement email confirmation: Add an email verification step after user registration to confirm their enrollment before they can use the application.
- Improve error handling: Provide more granular and user-friendly error messages on all clients (e.g., "Invalid repository name" instead of a generic "Bad Request").

### Low priority

- Type-safe API calls: Improve frontend type safety by generating types from the backend API specification.
- Refine UI/UX: Enhance the user experience on both web and mobile clients with better loading states, animations, and accessibility improvements.
