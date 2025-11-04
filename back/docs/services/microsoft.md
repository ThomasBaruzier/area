# Microsoft service

### Codebase locations

- Controller (notification endpoint): `src/auth/microsoft/microsoft.controller.ts`
  - Exposes `POST /auth/microsoft/outlook`, which receives Graph change notifications and handles the validation token.
- Service: `src/auth/microsoft/microsoft.service.ts`
  - Implements subscription creation (`startWatchMail`), the `mailReceived` handler, and the `sendMail` reaction.
- Types / DTOs: `src/auth/microsoft/microsoft.types.ts` (includes `SendMicrosoftMailDto`).
- Reaction Executor (wiring): `src/reactions/reaction-executor.service.ts`
  - Routes reactions for the `microsoft` service to `MicrosoftService` methods.
- Trigger Dispatcher: `src/reactions/trigger.service.ts`
  - When a Microsoft notification hits the webhook, the service calls `triggerService.handleTrigger("microsoft", "mail_received", payload)` to start workflows.

---

## Microsoft runtime flow

1. When a user connects their Microsoft account, the app stores a `ServiceConnection` with their token and a `ServiceUserIdentity`.
2. The app calls `startWatchMail(accessToken, workflowId)`, which creates a Graph subscription (`POST https://graph.microsoft.com/v1.0/subscriptions`) for the `/me/mailFolders('Inbox')/messages` resource.
3. Microsoft Graph sends an initial validation token `POST` to the registered webhook URL. The controller responds with the token in plain text (status 200) to validate the webhook.
4. On subsequent events (e.g., a new email), Graph posts a notification to the webhook. The service finds the matching `Workflow` by its subscription ID and calls `triggerService.handleTrigger('microsoft','mail_received', { workflowId })`.
5. The trigger service loads matching workflows, and the reaction executor will execute the registered reactions. For Microsoft, `send_mail` is implemented in `MicrosoftService.sendMail` and routed by the `ReactionExecutor`.

(Note on implementation: Microsoft Graph subscriptions have an expiration time and must be renewed periodically by re-creating or updating them.)

---

### A note on webhook URLs

Unlike some other services (like GitHub), the Microsoft Graph API requires a synchronous validation handshake to create a webhook subscription. When our backend requests a new subscription, Microsoft's servers immediately send a `POST` request to our specified `notificationUrl` containing a `validationToken`. Our server must respond to this request with a `200 OK` status and the validation token in the response body.

The project's central webhook proxy (`WEBHOOK_PROXY_URL_TUNNEL`) is designed for asynchronous "fire-and-forget" broadcasting and is therefore incompatible with this requirement.

To solve this, the `MicrosoftService` intentionally bypasses the broadcast proxy and uses the direct `BACKEND_URL` for its webhook `notificationUrl`. When in tunnel mode, the `frp` tunnel correctly forwards this synchronous traffic, allowing the validation to succeed.

---

### How to add a new microsoft trigger

If you want to add a new event (for example, `calendar_event_created`):

1. Add an `Action` record so users can select it when building workflows:

```ts
await prisma.action.create({
  data: {
    name: 'calendar_event_created',
    description: 'A calendar event was created',
    serviceId: microsoft.id,
    jsonFormat: {},
  }
});
```

2. Decide which Microsoft resource to subscribe to (e.g., `/me/events` for user calendar events).

3. Implement subscription creation in `MicrosoftService` (you can use `startWatchMail` as a template). Key points:

   - `POST` to `https://graph.microsoft.com/v1.0/subscriptions` with a body like:

     ```json
     {
       "changeType": "created",
       "notificationUrl": "https://<your-backend>/auth/microsoft/outlook",
       "resource": "/me/events",
       "expirationDateTime": "<ISO-8601-date>"
     }
     ```
   - Include an `Authorization: Bearer <access_token>` header. The access token must have the required read permission for that resource (e.g., `Calendars.Read`).
   - On success, you get back a subscription `id` that should be saved (the example project stores it in `Workflow.identifier` so notifications can be matched to a workflow).

4. Handle incoming notifications in `mailReceived` (consider renaming it to a generic `notificationReceiver` or extending it):

   - When a notification arrives, look up the `Workflow` using the `subscriptionId`.
   - Build a payload that the trigger expects and call `this.triggerService.handleTrigger('microsoft', '<your_event_name>', triggerPayload)`.

5. Renew the subscription before its `expirationDateTime`. The code in this repository sets the expiration to one hour in `startWatchMail`; adapt as needed.

---

### How to add a new microsoft reaction

If you want to add a new reaction, for example `create_calendar_event`:

1. Add a `Reaction` record to the database:

```ts
await prisma.reaction.create({
  data: {
    name: 'create_calendar_event',
    description: 'Create a calendar event',
    serviceId: microsoft.id,
    jsonFormat: {
      subject: 'string',
      start: 'string',
      end: 'string'
    }
  }
});
```

2. Implement the logic in `MicrosoftService` with a new method like `createCalendarEvent(userId, reactionData)`:

```ts
async createCalendarEvent(userId: number, reactionData: Prisma.JsonValue): Promise<void> {
  const serviceConnection = await this.prisma.serviceConnection.findFirst({ where: { userId, service: { name: 'microsoft' } } });
  if (!serviceConnection?.token) throw new Error('No Microsoft token found for user.');

  // Transform and validate reactionData into a DTO
  const dto = /* ... */;

  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceConnection.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* event body from DTO */ })
  });

  if (!response.ok) throw new Error('Failed to create Microsoft Graph event.');
}
```

3. Wire it in the `ReactionExecutorService` (`src/reactions/reaction-executor.service.ts`) so that a `Reaction` with `service.name === 'microsoft'` and `reaction.name === 'create_calendar_event'` calls your new method. Look for the `executeMicrosoftReaction` switch statement and add a new case.

4. Update the `jsonFormat` in the seed data so the frontend knows which fields to collect from the user.

---

## Security and permissions

- Creating Graph subscriptions for mail requires the `Mail.Read` permission. Sending mail requires `Mail.Send`.
- The Graph service will `POST` a `validationToken` to your notification URL immediately after you create a subscription. Your endpoint must respond with the token in plain text and an HTTP 200 status to validate the webhook.
- Subscriptions expire and must be renewed. See the Graph documentation for the maximum expiration windows for different resources.

---

## Examples in this repository

- `MicrosoftService.startWatchMail`: Demonstrates how to create a Graph subscription for inbox messages and save the `subscription.id`.
- `MicrosoftService.mailReceived`: Demonstrates how to handle the `validationToken` and dispatch `mail_received` triggers.
- `MicrosoftService.sendMail`: A working example of a Reaction that sends mail via `POST https://graph.microsoft.com/v1.0/me/sendMail`.
- `src/reactions/reaction-executor.service.ts`: Shows how reactions are dispatched to service-specific implementations.

---

## Useful microsoft graph resources

- Change notifications (webhooks) overview: [Link](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)
- Create subscription (API docs): [Link](https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions)
- Outlook mail change notifications: [Link](https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview)
- Graph permissions reference: [Link](https://learn.microsoft.com/en-us/graph/permissions-reference)

---

## Example: full flow to add `send_calendar_invite` reaction

1. Add the `Reaction` record in the seed file (see earlier example).
2. Implement `MicrosoftService.sendCalendarInvite(userId, reactionData)`.
3. Add a `case 'send_calendar_invite'` in `executeMicrosoftReaction` to call your new method.
4. Update the frontend form to collect required fields (subject, start, end, attendees). The `jsonFormat` in the database controls this UI schema.
5. Test the flow end-to-end with a user who has a valid Microsoft token and the proper Graph permissions.
