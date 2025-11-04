# Area backend

This directory contains the NestJS application server, which is the core of the AREA platform.

## Overview

The backend is responsible for:
- Providing a RESTful API for the web and mobile clients.
- Managing user authentication (local registration/login and OAuth2 for external services).
- Handling all business logic for creating, managing, and executing workflows.
- Interacting with the PostgreSQL database via Prisma.
- Handling webhooks from external services like GitHub and Google to trigger workflows.

## Development

The backend runs inside a Docker container orchestrated by Docker Compose. All development commands should be run from the project root.

### Running the server

To start the backend server along with the database and web client:
```bash
# From the project root
./dev.sh up
```
The server runs in watch mode, so any changes to the source code will trigger an automatic reload. The API will be available at the URL specified by `BACKEND_URL` in your `.env` file (e.g., `http://localhost:8080`).

### Testing

To run the default test suite (build, lint, unit tests) in an isolated Docker environment:
```bash
# From the project root
./test.sh back
```

To include end-to-end tests:
```bash
# From the project root
./test.sh back:all
```

To run backend-specific tests manually:
```bash
# From within the back/ directory
# Install dependencies if you haven't already
npm install

# Run linting
npm run lint

# Run unit tests
npm run test

# Run end-to-end tests
npm run test:e2e
```

Note: Running `npm run test:e2e` manually requires a properly configured test database. For a simpler and more reliable setup, use the root `test.sh` script (e.g., `./test.sh back:e2e`), which automatically provisions a temporary test database in an isolated Docker environment.

## Database

The project uses PostgreSQL with Prisma as the ORM.
- Schema: The database schema is defined in `prisma/schema.prisma`.
- Migrations: Migrations are located in `prisma/migrations`. The development server runs `npx prisma migrate deploy` on startup to apply them.
- Seeding: The database is seeded with initial service, action, and reaction data from `prisma/seed.ts`, which is also run on startup.
- Prisma Studio: The development container exposes Prisma Studio at `http://localhost:5555` for easy database browsing.


## Adding features

- To add a service: [See documentation](./docs/services/adding-new-services.md)
- To add an action: Navigate to the `services/` directory and find the relevant service to modify.
- To modify the database: [See documentation](./docs/database.md)

## Further reading

- For a complete overview of the project, see the main [README.md](../README.md).
- For detailed API endpoint documentation, refer to the [API Reference](../docs/api-reference.md).
