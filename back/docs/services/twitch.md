# Twitch service

---

## Table of contents

- [Introduction](#introduction)
- [Creating a twitch project](#creating-a-twitch-project)
- [OAuth2](#oauth2)
- [Webhooks](#webhooks)
- [Triggers](#triggers)
- [Adding an action](#adding-an-action)
- [Reactions](#reactions)
- [Adding a reaction](#adding-a-reaction)

## Introduction

In this document, we explain how the Twitch service was built for AREA and how to extend it with new actions and reactions.

This service integrates with the Twitch API using OAuth2 for authentication and webhooks to receive event notifications.
Each Twitch action (for example, "new follower" or "stream online") can trigger a reaction (like sending a chat message or performing another action within the app).

## Creating a Twitch project

Before using the Twitch API, you need to create a project in the Twitch Developer Console. [Link](https://dev.twitch.tv/console)
1. Log in with your Twitch account.
2. Click "Register Your Application."
3. Choose a name for your app and set the Redirect URI (this is where Twitch redirects after user login; for example, `http://localhost:8080/auth/twitch/callback`).
4. Set the category to "Website Integration."
5. Once created, copy your Client ID and Client Secret, which you will need for OAuth2.

## OAuth2

Inside the `auth/twitch` folder, you will find:

- A module
- A service
- A controller
- A strategy
- A webhook guard

This service uses the `passport-twitch-strategy` library to handle OAuth2 authentication with Twitch.

### Strategy

In the `twitch.strategy.ts` file, we configure the OAuth2 strategy:
```
super({
  clientID: process.env.TWITCH_CLIENT_ID,
  clientSecret: process.env.TWITCH_CLIENT_SECRET,
  callbackURL: `${backendUrl}/auth/twitch/callback`,
  scope: ['user:read:email', ...]
});
```

### Note on custom strategy
The project uses a `CustomTwitchStrategy` (`custom-twitch.strategy.ts`) that extends the base strategy. This wrapper is essential for correctly handling redirects through the project's central OAuth proxy when the development tunnel is enabled. It dynamically constructs the correct authorization URL depending on whether the application is in local or tunnel mode.

- `clientID` / `clientSecret`: Credentials from your Twitch app.
- `callbackURL`: The endpoint Twitch will call after user login.
- `scope`: The permissions you request (e.g., access to email, chat, etc.).

### The `validate()` function

The `validate()` method is called once Twitch successfully authenticates the user. This allows Passport to validate the user and attach their profile to the request context.

### Callback and guard

The callback route handles Twitch's redirect after authentication. The guard (`AuthGuard('twitch')`) ensures that only valid Twitch OAuth responses are accepted. If authentication fails, it returns an HTTP 400 error. Otherwise, the guard allows execution to continue to the callback controller.

## Creating webhooks

[Twitch EventSub Documentation](https://dev.twitch.tv/docs/eventsub/)

When a Twitch action is selected in a workflow, we must create a webhook so that Twitch can notify our server when the event occurs.

In the `POST /api/workflow/create` route, the `createWebhook()` function is called. If the workflow uses Twitch, it calls `checkTwitch()` from the Twitch service.

### checkTwitch()

This function:

- Retrieves the newly created workflow.
- Gets the user's Twitch connection token.
- Based on the selected action, calls `makeWebhook()` to register a new webhook with Twitch.

### makeWebhook()

`makeWebhook()` builds a POST request to the Twitch API according to the official documentation.

Parameters typically include:

- `type`: The event type (e.g., `stream.online`).
- `version`: Usually `"1"`.
- `condition`: e.g., `{ broadcaster_user_id: <id> }`.
- `transport`: Delivery details (`method: "webhook"`, `callback`, `secret`).

If the webhook is created successfully, a success message is logged; otherwise, an error message with the HTTP status code is logged.

## Triggers

Once the webhook is created, Twitch will send a POST request to `POST /twitch/webhook` each time the event is triggered.

### Challenge validation

When the webhook is first registered, Twitch sends a challenge to verify your endpoint. You must respond with the same challenge and an HTTP 200 OK status to confirm the subscription.

### Event handling

After validation:

- The controller checks whether the received event type is supported.
- If it is, it calls `handleTriggers()` to process the event.
- The `handleTriggers()` function emits the event via an internal EventEmitter, which then triggers the appropriate reaction.

## Adding an action

To add a new Twitch action:

1. In the `checkTwitch()` function, add a condition for your new action:

```
if (action === 'twitch_newFollower') {
    type = 'user.follow';
    version = '2'; // Example version
    condition = { broadcaster_user_id: userId, moderator_user_id: userId };
}
```

2. Add the action to the list of supported events so it is recognized when triggered.

## Reactions

Example: Send a Message in Chat

- Retrieve the workflow and its `reactionDto`.
- Ensure a valid Twitch connection (token) exists.
- Perform an HTTPS POST request to the Twitch Chat API:
    - `POST https://api.twitch.tv/helix/chat/messages`
      with headers:
    - `Authorization: Bearer <access_token>`
    - `Client-Id: <client_id>`
    - `Content-Type: application/json`

- Handle errors based on the returned HTTP status code.

## Adding a reaction

- Create a dedicated function in the Twitch service.
- Add a corresponding case in `reaction-executor-service.ts`:

```
case 'twitch.sendMessage':
    await this.twitchService.sendMessage(reactionDto);
    break;
```

- Test the workflow to ensure the trigger action correctly executes the reaction.
