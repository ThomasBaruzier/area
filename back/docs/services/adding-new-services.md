# How to add a new service

This guide explains how to add a new service to AREA. Follow these steps to fully integrate the service, including its database entries, OAuth flow, and API routes.

---

## 1. Create a service folder

1. Inside `src/auth/`, create a folder with the name of the service.
2. Add the core files needed for the service (e.g., `google.strategy.ts`, `google.module.ts`, etc.).

---

## 2. Update the database seed

1. Open the seed file at `back/prisma/seed.ts`.
2. Add an entry for your service:
```javascript
 const spotify = await prisma.service.upsert({
        where: { name: 'spotify' },
        update: {},
        create: {
            name: 'spotify',
            description: 'Actions and reactions for Spotify.',
        },
    });
```
---
## 3. Create the OAuth strategy

You must create an OAuth2 strategy using Passport. For more information, see the [Passport.js documentation](https://www.passportjs.org/).

See the Google example: [link](../../src/auth/google/google.strategy.ts)

---
## 4. Add auth routes

In your controller, you must create routes for `auth/<service-name>` and `auth/<service-name>/callback`.

Your callback route must call `authService.handleOAuthCallback` to create a user connection record in the database.

See the Google example: [link](../../src/auth/google/google.controller.ts)
