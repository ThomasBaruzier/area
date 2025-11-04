# Spotify service developer guide

## Table of contents

- [1. Overview](#1-overview)
- [2. Prerequisites](#2-prerequisites)
- [3. Creating a spotify app](#3-creating-a-spotify-app)
- [4. Configuring the application](#4-configuring-the-application)
- [5. Scopes and permissions](#5-scopes-and-permissions)
- [6. Adding a reaction](#6-adding-a-reaction)
- [7. Updating or modifying scopes](#7-updating-or-modifying-scopes)
- [8. Implementation notes](#8-implementation-notes)
- [9. Links and references](#9-links-and-references)

### 1. Overview

This document describes how to integrate Spotify into our system via the Spotify Web API, manage authentication, tokens, reactions, and playback operations.
We handle:
- User authentication via OAuth2 (Authorization Code flow).
- Token refresh logic.
- Executing reactions like "set playback volume," "pause playback," "skip to next/previous," and "create playlist."
- Service connection persistence in the database (via Prisma).

### 2. Prerequisites

Before you start, ensure you have:

- A valid Spotify developer account (go to: https://developer.spotify.com/).
- Access to the system's backend (NestJS service) where the Spotify service module resides.
- Environment variables set for `CLIENT_ID_SPOTIFY` and `CLIENT_SECRET_SPOTIFY`.
- A database table for service connections (`ServiceConnection`) that stores the access token, refresh token, `userId`, service name, etc.
- The HTTP service set up (via `@nestjs/axios`) for making calls to Spotify's Web API.

### 3. Creating a Spotify app

To create your Spotify developer application:

1. Go to the Spotify Developer Dashboard (https://developer.spotify.com/dashboard).
2. Click "Create an App."
3. Provide an App Name and App Description, agree to the Developer Terms of Service, then click "Create."
4. After creation, you will see your Client ID and Client Secret.
5. Click "Edit Settings" and configure your Redirect URIs. These are the URL(s) your backend will use for the OAuth callback. Example: `https://p.3z.ee/auth/callback` for development with tunneling.
6. Save the settings. You now have credentials to use in your backend.

### 4. Configuring the application

In your backend NestJS service, configure the Spotify strategy (e.g., `SpotifyStrategy`):
- Use `clientID = CLIENT_ID_SPOTIFY`.
- Use `clientSecret = CLIENT_SECRET_SPOTIFY`.
- Set `callbackURL` to your redirect URI.
- Define the list of scopes (see next section).
- Use `passReqToCallback: true` if you need access to the Request object in the callback.
- Ensure that access and refresh tokens are saved to your database via Prisma when a user connects their account.

You must also implement token refresh logic: use the refresh token to request a new access token when the old one expires.

### 5. Scopes and permissions

Scopes determine what your application is allowed to do on behalf of a user.

Common scopes used in this service include:
- `user-read-email`
- `user-read-private`
- `playlist-modify-public`
- `playlist-modify-private`
- `user-read-playback-state`
- `user-modify-playback-state`
- `user-read-currently-playing`
These scopes enable reading user email, creating/modifying playlists, controlling playback, etc.

Important notes:
- If no scopes are specified, only public information is accessible.
- Some scopes require the user to grant permission explicitly.
- You must include the full, space-separated scope list in the authorization URL:
    ```
    https://accounts.spotify.com/authorize?
      response_type=code
      &client_id=<CLIENT_ID>
      &scope=user-read-email%20playlist-modify-public
      &redirect_uri=<REDIRECT_URI>
      &state=<STATE>
    ```
- In development mode, your app might have limits (on the number of users or certain endpoints) until you request full production access.

### 6. Adding a reaction

In our system, a "reaction" is an action triggered for a user's connected Spotify account. Here's how to add one:

1. Define the reaction in the system (e.g., "Create Playlist," "Set Playback Volume").
2. Ensure the reaction's DTO is defined (e.g., `CreatePlaylistDto`, `SetPlaybackVolumeDto`).
3. Ensure the user has a stored Spotify connection in the database (`ServiceConnection`) with a valid access token.
4. Call the service method from the reaction executor (e.g., `await spotifyService.createPlaylist(userId, reactionData);`).
5. Validate the DTO (via `class-transformer` and `class-validator`) to ensure data integrity.
6. Make the external request to Spotify's Web API using the stored access token. If it fails with a 401 error (expired token), refresh the token and retry the request.
7. Handle logging and errors appropriately.

### 7. Updating or modifying scopes

If you need to modify the scope list to add new capabilities, follow this process:

1. In your backend strategy (`SpotifyStrategy`), update the scope array.
  Example:
    ```ts
    scope: [
      "user-read-email",
      "playlist-modify-public",
      "playlist-read-private",
      // new scope added:
      "user-library-read"
    ],
    ```
2. Update your code and documentation to reflect the new capabilities.
3. Inform users that they may need to re-authorize the application so that Spotify prompts them to grant the new permissions.
4. Handle the possibility of missing scopes gracefully in your code (e.g., log a warning or fail with an informative message).

### 8. Implementation notes

- All HTTP calls to Spotify must include an `Authorization: Bearer <access_token>` header.
- To refresh a token, send a `POST` request to `https://accounts.spotify.com/api/token` with `grant_type=refresh_token`, `refresh_token=<...>`, and Basic Authentication using your client ID and secret.
- Store the refreshed token in `ServiceConnection.token`.
- Always type your HTTP responses (e.g., `post<{ access_token: string }>(...)`) to avoid using `any` and ensure safe property access.
- In your `catch` blocks, type the error as `unknown` and then inspect it safely (e.g., check for `response?.status === 401`).
- Use logging to track the success or failure of token refreshes, API requests, and missing connections.
- Remember that Spotify may impose quotas when your app is in Development Mode. For production, you can request a quota increase from the Developer Dashboard.

### 9. Links and references

- Spotify Web API - Authorization: [Link](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- Spotify Web API - Scopes: [Link](https://developer.spotify.com/documentation/web-api/concepts/scopes/)
- Spotify Web API - Apps Concept: [Link](https://developer.spotify.com/documentation/web-api/concepts/apps/)
- Spotify Web API Reference: [Link](https://developer.spotify.com/documentation/web-api/reference/)

### Important notes for developers

- Whenever you change scope requirements, you must handle "missing permission" errors gracefully in your code.
- Changing a Redirect URI in the Spotify Dashboard requires updating your environment configuration accordingly.
- Token expiration and refresh are critical processes; if a refresh fails, the user must reconnect their account.
- Logging is essential: record which user, which connection, and what error occurred.
- Treat user credentials securely, as you are storing tokens and user IDs.
