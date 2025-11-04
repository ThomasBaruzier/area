# GitHub service developer guide

## Table of contents

- [1. Overview](#1-overview)
- [2. Prerequisites](#2-prerequisites)
- [3. Creating a github app](#3-creating-a-github-app)
- [4. Configuring the application](#4-configuring-the-application)
- [5. Scopes and permissions](#5-scopes-and-permissions)
- [6. Adding a reaction](#6-adding-a-reaction)
- [7. Updating or modifying scopes](#7-updating-or-modifying-scopes)
- [8. Implementation notes](#8-implementation-notes)

### 1. Overview

This document describes how to integrate GitHub into our system via its Web API, manage authentication, tokens, and reactions.
We handle:
- User authentication via OAuth2 (Authorization Code flow).
- Token refresh logic.
- Executing reactions like "New push to repository," "New pull request," "Create issue," and "Create release."
- Service connection persistence in the database (via Prisma).

### 2. Prerequisites

Before you start, ensure you have:

- A valid OAuth App on GitHub (go to: https://github.com/settings/developers).
- Access to the system's backend (NestJS service) where the GitHub service module resides.
- Environment variables set for `CLIENT_ID_GITHUB` and `CLIENT_SECRET_GITHUB`.
- A database table for service connections (`ServiceConnection`) that stores the access token, refresh token, `userId`, service name, etc.
- The HTTP service set up (via `@nestjs/axios`) for making calls to GitHub's Web API.

### 3. Creating a GitHub app

To create your GitHub developer application:

1. Go to your GitHub Developer settings (https://github.com/settings/developers).
2. Click "New OAuth App."
3. Provide an App Name, Homepage URL, App Description, and Authorization callback URL, then click "Register application."
4. After creation, you will see your Client ID and Client Secret.
5. Configure your app's settings, including the Redirect URIs that your backend will use for the OAuth callback. Example: `https://p.3z.ee/auth/callback` for development with tunneling.
6. Save the settings. You now have credentials to use in your backend.

### 4. Configuring the application

In your backend NestJS service, configure the GitHub strategy (e.g., `GithubStrategy`):
- Use `clientID = CLIENT_ID_GITHUB`.
- Use `clientSecret = CLIENT_SECRET_GITHUB`.
- Set `callbackURL` to your redirect URI.
- Define the list of scopes (see next section).
- Use `passReqToCallback: true` if you need access to the Request object in the callback.
- Ensure that access and refresh tokens are saved to your database via Prisma when a user connects their account.

You must also implement token refresh logic: use the refresh token to request a new access token when the old one expires.

### 5. Scopes and permissions

Scopes determine what your application is allowed to do on behalf of a user.

Common scopes used in this service include:
- `read:user`
- `user:email`
- `notifications`
- `admin:repo_hook`
- `repo`
These scopes enable reading user email, creating webhooks in repositories, etc.

Important notes:
- If no scopes are specified, only public information is accessible.
- Some scopes require the user to grant permission explicitly.
- You must include the full, space-separated scope list in the authorization URL:
      ```
      https://github.com/login/oauth/authorize?
        response_type=code
        &client_id=<CLIENT_ID>
        &scope=read:user%20repo
        &redirect_uri=<REDIRECT_URI>
        &state=<STATE>
      ```
- In development mode, your app might have limits (on the number of users or certain endpoints) until you request full production access.

### 6. Adding a reaction

In our system, a "reaction" is an action triggered for a user's connected GitHub account. Here's how to add one:

1. Define the reaction in the system (e.g., "Create Issue").
2. Ensure the reaction's DTO is defined.
3. Ensure the user has a stored GitHub connection in the database (`ServiceConnection`) with a valid access token.
4. Call the service method from the reaction executor (e.g., `await this.githubService.createIssue(userId, reactionData);`).
5. Validate the DTO (via `class-transformer` and `class-validator`) to ensure data integrity.
6. Make the external request to GitHub's Web API using the stored access token. If it fails with a 401 error (expired token), refresh the token and retry the request.
7. Handle logging and errors appropriately.

### 7. Updating or modifying scopes

If you need to modify the scope list to add new capabilities, follow this process:

1. In your backend strategy (`GithubStrategy`), update the scope array.
   Example:
    ```ts
    scope: [
      "read:user",
      "repo",
      // new scope added:
      "project"
    ],
    ```
2. Update your code and documentation to reflect the new capabilities.
3. Inform users that they may need to re-authorize the application so that GitHub prompts them to grant the new permissions.
4. Handle the possibility of missing scopes gracefully in your code (e.g., log a warning or fail with an informative message).

### 8. Implementation notes

- All HTTP calls to GitHub must include an `Authorization: Bearer <access_token>` header.
- Always type your HTTP responses (e.g., `post<{ access_token: string }>(...)`) to avoid using `any` and ensure safe property access.
- In your `catch` blocks, type the error as `unknown` and then inspect it safely (e.g., check for `response?.status === 401`).
- Use logging to track the success or failure of token refreshes, API requests, and missing connections.
- Remember that GitHub may impose quotas when your app is in Development Mode. For production, you can request a quota increase from the Developer Dashboard.

### Important notes for developers

- Whenever you change scope requirements, you must handle "missing permission" errors gracefully in your code.
- Logging is essential: record which user, which connection, and what error occurred.
- Treat user credentials securely, as you are storing tokens and user IDs.
