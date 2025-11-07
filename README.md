# Area: action-reaction automation platform

Area is a full-stack automation platform, similar to IFTTT or Zapier, that allows users to connect services and create automated workflows. It consists of a NestJS backend, a React web client, and a native Android mobile client, all containerized with Docker for seamless setup and deployment.

## Table of contents

1. [Project overview](#1-project-overview)
  - [Technology stack](#technology-stack)
  - [Key features](#key-features)
2. [Getting started](#2-getting-started)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Development environment](#development-environment)
  - [Production configuration](#production-configuration)
  - [Building the mobile app](#building-the-mobile-app)
3. [Project structure](#3-project-structure)
4. [Documentation suite](#4-documentation-suite)
5. [Scripts overview](#5-scripts-overview)
6. [Collaborators](#6-collaborators)

## 1. Project overview

The Area platform empowers users to link various services (like GitHub and Gmail) by creating workflows. A workflow consists of a single action (a trigger from one service) that executes one or more reactions (tasks in other services).

- Backend (NestJS): The core application server that handles all business logic, authentication, database interactions, and service integrations.
- Web client (React): A rich web interface for managing user accounts and visually building and managing workflows.
- Mobile client (Android): A native Jetpack Compose application that provides a mobile-first experience for managing workflows on the go.

### Technology stack

| Area | Technology |
|------|------------|
| Backend | NestJS, TypeScript, Prisma, PostgreSQL |
| Web client | React, TypeScript, Vite, ReactFlow |
| Mobile client | Kotlin, Jetpack Compose, Hilt, Retrofit, Coroutines |
| DevOps | Docker, Docker Compose, Bash |
| Testing | Jest, Supertest (Backend), Vitest (Frontend) |

### Key features

- Multi-provider authentication: Supports local email/password registration and OAuth2 for external services.
- Service connection: Securely links user accounts to external services like Google and GitHub.
- Visual workflow builder: A drag-and-drop interface (web client) for creating and connecting actions and reactions.
- Automated workflow execution: Workflows are triggered automatically by webhooks from connected services.
- Containerized and rootless environment: Consistent and reproducible setup for development and testing using Docker, with all services running as the host user to prevent permission issues.

## 2. Getting started

Follow these steps to get the entire platform running locally.

### Prerequisites

- Docker and Docker Compose: Essential for running the containerized services.
- A shell environment (like Bash on Linux/macOS or Git Bash on Windows).

### Configuration

All environment variables are managed in a single `.env` file at the project root.

1. Create the `.env` file:
```bash
cp .env.example .env
```
2. Edit `.env`: Open the newly created `.env` file and provide values for all variables.
  - For local development, you only need to adjust the ports (`WEB_PORT`, `SERVER_PORT`) if they conflict with other services on your machine.
  - It is crucial to obtain and configure valid credentials for the OAuth services (e.g., Google, GitHub) for the application to function correctly.

### Development environment

The `dev.sh` script is the primary tool for managing the development lifecycle. The entire setup is designed to be "rootless," meaning all application containers run with your user's permissions to avoid file ownership issues.

To start all services (backend, web client, database):
```bash
./dev.sh up
```
This command will:
- Build the necessary Docker images.
- Start containers for the backend, web client, and PostgreSQL database.
- Mount local source code into the containers for hot-reloading.

Services will be available at the URLs constructed in your `.env` file (e.g., `http://localhost:8081` for the web app, `http://localhost:8080` for the API).

Other useful `dev.sh` commands:
- `./dev.sh down`: Stops all running services.
- `./dev.sh logs server`: Tails the logs for a specific service (e.g., `server`).
- `./dev.sh mobile`: Builds the Android APK.
- `./dev.sh clean`: Stops all services and removes volumes and all build artifacts.

To stop all services:
```bash
./dev.sh down
```

### Tunneling for development (webhooks and OAuth)

To test integrations with external services like GitHub and Google, you need a public URL. The project includes a built-in tunneling solution using `frp` and a central proxy.

1. Enable tunneling: In your `.env` file, set `TUNNEL=true`.
2. Configure subdomain: Set `FRP_SUBDOMAIN` to a unique name (e.g., `my-area-dev`).
3. Get credentials: The `FRP_AUTH_TOKEN`, `FRP_SERVER_ADDR`, and `FRP_SERVER_PORT` are pre-configured to use the project's central tunnel server. You can find these values in `.env.example`.
4. Start services: Run `./dev.sh up`.

Your development server will now be publicly accessible at `https://<your-subdomain>.dev.area.3z.ee`. The script automatically configures the backend and frontend to use this public URL for OAuth callbacks and webhook registration.

### Production configuration

The `.env` structure is designed to easily transition from development to production. To configure for a live server:

1. Set full URLs: In your production `.env` file, directly overwrite the `FRONTEND_URL` and `BACKEND_URL` variables with your public domains. The `APP_HOST`, `WEB_PORT`, and `SERVER_PORT` variables will be ignored.
  ```
  # .env (Production example)
  FRONTEND_URL=https://app.yourdomain.com
  BACKEND_URL=https://api.yourdomain.com
  ...
  ```
2. Reverse proxy: In a typical production setup, you would use a reverse proxy (like Nginx or Traefik) to handle incoming traffic on ports 80/443 and forward it to the appropriate Docker containers. The reverse proxy would also manage SSL/TLS termination.

### Building the mobile app

The mobile app is built within a dedicated Docker container to ensure a consistent build environment.

To build the `client.apk` file:
```bash
./dev.sh mobile
```
The compiled APK will be available in the `front/public/` directory. The web client is configured to serve this file at `http://localhost:8081/client.apk` (or your configured `FRONTEND_URL`), making it available for download.

## 3. Project structure

```
.
├── back/               # NestJS backend application
├── front/              # React web app
├── mobile/             # Android mobile client application
├── docs/               # Detailed project documentation
├── docker-compose.yml  # Main Docker Compose configuration for development
├── .env.example        # Environment variable template
├── dev.sh              # Main development script
└── test.sh             # Script to run the complete test suite
```

## 4. Scripts overview

- `dev.sh`: Manages the development environment.
  - `./dev.sh up`: Starts all services.
  - `./dev.sh down`: Stops all services.
  - `./dev.sh mobile`: Builds the Android APK.
  - `./dev.sh clean`: Stops services and removes all build artifacts and volumes.
- `test.sh`: Runs tests for the backend and frontend in a clean Docker environment. By default (without arguments), it runs build, lint, and unit tests. To include end-to-end tests, use `./test.sh all` or specific targets like `./test.sh back:e2e front:e2e`.

## 5. Documentation suite

For more detailed information, please refer to the following documentation:

* [`README.md`](./README.md): Project entry point and setup guide.
* [`CONTRIBUTING.md`](./CONTRIBUTING.md): How to contribute, develop, and test.
* [`ROADMAP.md`](./ROADMAP.md): Project features and future plans.
* `docs/`
  * [`README.md`](./docs/README.md): Hub for high-level project documentation.
  * [`api-reference.md`](./docs/api-reference.md): Complete REST API specification.
  * [`overview.md`](./docs/overview.md): High-level system architecture and data flows.
  * [`tunneling.md`](./docs/tunneling.md): Guide for the local development tunnel feature.
* `back/`
  * [`README.md`](./back/README.md): Main developer guide for the backend.
  * `docs/`
    * [`database.md`](./back/docs/database.md): Prisma schema, migrations, and seeding guide.
    * `services/`
      * [`README.md`](./back/docs/services/README.md): Index of external service integration guides.
      * [`adding-new-services.md`](./back/docs/services/adding-new-services.md): How to integrate a new service.
      * [`discord.md`](./back/docs/services/discord.md): Discord bot and Gateway integration details.
      * [`github.md`](./back/docs/services/github.md): GitHub App, OAuth, and webhook guide.
      * [`gmail.md`](./back/docs/services/gmail.md): Gmail API, OAuth, and push notification guide.
      * [`microsoft.md`](./back/docs/services/microsoft.md): Microsoft Graph API and webhook integration.
      * [`spotify.md`](./back/docs/services/spotify.md): Spotify Web API, scopes, and reactions guide.
      * [`twitch.md`](./back/docs/services/twitch.md): Twitch API, OAuth, and EventSub webhook guide.
* `front/`
  * [`README.md`](./front/README.md): Main developer guide for the frontend.
  * `docs/`
    * [`api-fetching.md`](./front/docs/api-fetching.md): Centralized utility for backend API calls.
    * [`authentication.md`](./front/docs/authentication.md): Frontend authentication and JWT handling.
    * [`components.md`](./front/docs/components.md): Technical reference for main React components.
    * [`cypress-guide.md`](./front/docs/cypress-guide.md): Best practices for Cypress e2e testing.
    * [`routing.md`](./front/docs/routing.md): React Router navigation and protected routes.
    * [`user-guide.md`](./front/docs/user-guide.md): A guide for end-users of the web app.
* `mobile/`
  * [`README.md`](./mobile/README.md): Developer guide for the native Android client.

## 6. Contributors

- Edgar Brunet - [GitHub Profile](https://github.com/edgarbnt)
- Hélène Houplain - [GitHub Profile](https://github.com/Houpsi)
- Matisse Dufour - [GitHub Profile](https://github.com/Dufour-Matisse)
- Thomas Baruzier - [GitHub Profile](https://github.com/ThomasBaruzier)
- Aleksandra Racine - [GitHub Profile](https://github.com/Aleksrac)
