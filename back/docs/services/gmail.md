# Gmail service

---

## Table of contents

- [Introduction](#introduction)
- [Creating a google cloud project](#creating-a-google-cloud-project)
- [OAuth2](#oauth2)
- [Push notifications (watch() API)](#push-notifications-watch-api)
- [Triggers](#triggers)
- [Adding an action (trigger)](#adding-an-action-trigger)
- [Reactions](#reactions)
- [Adding a reaction](#adding-a-reaction)

## Introduction
In this document, we explain how the Gmail service was built for AREA and how to extend it with new actions and reactions.

This service integrates with the Gmail API using OAuth2 for authentication and Push Notifications (via Google Cloud Pub/Sub) to receive real-time event notifications (e.g., for a new email).

Each Gmail action (for example, "new email received") can trigger a reaction (like sending an email or performing another task).

### Creating a google cloud project
Before using the Gmail API, you must create a project in the Google Cloud Console and enable the correct APIs.

- Log in to the Google Cloud Console.
- Create a new project.
- From the dashboard, go to "APIs and Services" and click "Enable APIs and Services."
- Search for and enable the Gmail API.
- Search for and enable the Google Cloud Pub/Sub API (this is necessary for push notifications).
- Go to "APIs and Services" -> "Credentials."
- Click "Create Credentials" -> "OAuth client ID."
- Configure the OAuth consent screen if you have not already done so.
- Choose "Web application" as the application type.
- Add an "Authorized redirect URI." For local development, this will be `http://localhost:8080/auth/google/callback`.
- Once created, copy your Client ID and Client Secret.

## OAuth2
Inside the `auth/google` folder, you will find:

- A module
- A service
- A controller
- A strategy
- A guard
This service uses the Passport library (with `passport-google-oauth20`) to handle OAuth2 authentication with Google.

### Strategy
In the `google.strategy.ts` file, we configure the OAuth2 strategy:

```
super({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${backendUrl}/auth/google/callback`,
  scope: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ],
});
```

- `clientID` / `clientSecret`: Credentials from your Google Cloud application.
- `callbackURL`: The endpoint Google will call after user login.
- `scope`: The permissions you request (e.g., read emails, send emails, access profile).

### The `validate()` function
Once Google authenticates the user, Passport calls the `validate()` method, which attaches the user profile to the request context.

### Callback and guard
The callback route handles Google's redirect after authentication. The guard (`GoogleAuthGuard`) ensures that only valid Google OAuth responses are accepted. If authentication fails, it returns an HTTP 400 error. Otherwise, the guard allows execution to continue to the callback controller.

### Setting up push notifications (watch() API)
[Gmail watch() Documentation](https://developers.google.com/gmail/api/guides/push)

Instead of constant polling, Gmail uses a Push Notification system via Google Cloud Pub/Sub to notify our server of changes. When a Gmail action is selected in a workflow, we must "watch" the user's inbox.

When a workflow is created via the `POST /api/workflow/create` route, a function like `createSubscription()` is called. If the workflow uses Gmail, it calls `checkGmail()` from the Gmail service.

### checkGmail()
This function:

- Retrieves the newly created workflow.
- Gets the user's Google connection token.
- Based on the selected action (e.g., "new email"), calls `startWatch()` to register a "watcher" on the user's inbox.

### startWatch()
`startWatch()` builds a POST request to the Gmail API to start watching the inbox:

Gmail `watch()` API: `POST https://gmail.googleapis.com/gmail/v1/users/me/watch`

Parameters (JSON body):

- `topicName`: The full name of the Pub/Sub topic you created in your Google Cloud project (e.g., `projects/my-project/topics/gmail-notifications`).
- `labelIds`: The labels to watch (e.g., `['INBOX']`).

The Gmail API will then send notifications to this Pub/Sub topic. You must also create a subscription to this topic, configured to send messages to your webhook URL (e.g., `https://your-api.com/google/webhook`).

## Triggers
Once `watch()` is active, Google Pub/Sub will send a POST request to `POST /google/webhook` each time an event occurs.

### Receiving pub/sub events
The POST request body from Pub/Sub does not contain the email itself but rather a Base64-encoded message:

```json
{
    "message": {
        "data": "BASE64_ENCODED_DATA",
        "messageId": "..."
    },
    "subscription": "..."
}
```

Your controller must:

- Decode the `data` field from Base64, which reveals a JSON object containing `emailAddress` and `historyId`.
- Use this `historyId` to call the Gmail API `history.list()` (e.g., `GET /gmail/v1/users/me/history?startHistoryId=...`).
- This response indicates what has changed (e.g., `messagesAdded`).
- Using the new message ID, you can call `messages.get()` to retrieve the email's content.

## Event handling
Once the new message is retrieved:

- The controller checks if the event type is relevant (e.g., does the email match the action's criteria?).
- If so, it calls `handleTriggers()` to process the event.
- The `handleTriggers()` function emits the event via an internal EventEmitter, which then triggers the appropriate reaction.

## Adding an action (trigger)
To add a new Gmail action (e.g., "new email from a specific sender"):
1. In the `checkGmail()` function, ensure `startWatch()` is called (watching the `INBOX` is usually sufficient for most actions).
2. The primary logic resides in the webhook handler (`/google/webhook`). After fetching the new message (via `history.list` then `messages.get`), add a condition:

```
// In the service handling the webhook
const fromHeader = message.payload.headers.find(h => h.name === 'From');
if (action === 'gmail_newEmailFrom' && fromHeader.value.includes(actionParams.senderEmail)) {
  // Sender matches, trigger the reaction
  this.eventEmitter.emit('trigger', workflow, messageData);
}
```

3. Add the action to the list of supported events so it is recognized.

## Reactions
Example: Send an Email

- Retrieve the workflow and its `reactionDto`.
- Ensure a valid Google connection (token) exists.
- Build the email in MIME format (RFC 2822) and Base64-encode it.

```
const emailLines = [
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    'Content-Transfer-Encoding: 7bit',
    `To: ${reactionDto.to}`,
    `Subject: ${reactionDto.subject}`,
    '',
    reactionDto.body,
];
const email = emailLines.join('\r\n');
const base64EncodedEmail = Buffer.from(email).toString('base64url');
```

- Perform an HTTPS POST request to the Gmail API:

`POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`

With headers:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

And the JSON body:
```
{
    "raw": "YOUR_BASE64URL_ENCODED_EMAIL"
}
```
- Handle any errors based on the returned HTTP status code.

## Adding a reaction
1. Create a dedicated function in `gmail.service.ts` (e.g., `sendEmail(reactionDto)`).
2. Add a corresponding case in `reaction-executor-service.ts`:

```
case 'gmail.sendEmail':
    await this.gmailService.sendEmail(reactionDto);
    break;
```
3. Test the workflow to ensure the trigger action correctly executes the email sending reaction.
