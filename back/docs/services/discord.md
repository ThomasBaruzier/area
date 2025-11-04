# Discord service developer guide

## 1. Overview

The Discord integration allows users to connect their Discord account to the AREA platform. It uses a combination of OAuth2 for user authentication and a Discord Bot connected to the Gateway for real-time event handling.

- Authentication: Users connect their accounts via a standard OAuth2 flow.
- Triggers (Actions): A bot listens for events, such as new messages in a channel.
- Reactions: The bot can perform actions, like sending a message to a channel, on behalf of the application.

## 2. Authentication flow

Authentication is handled by `passport-discord`.

- Strategy: The implementation is in `back/src/auth/discord/discord.strategy.ts`.
- Scopes: The application requests `identify`, `email`, `guilds`, and `bot` scopes. The `bot` scope is crucial for allowing the application to add its bot to a user's server.
- Controller: `back/src/auth/discord/discord.controller.ts` manages the `/auth/discord` and `/auth/discord/callback` routes.

## 3. Triggers (actions)

Triggers are handled in real-time by a Discord Bot that connects to the Discord Gateway.

- `GatewayService`: Located in `back/src/discord/gateway.service.ts`, this service is responsible for logging in the bot using the `DISCORD_BOT_TOKEN` from the `.env` file.
- `new_message` Action: The `GatewayService` listens for the `Events.MessageCreate` event. When a non-bot user sends a message, it fires a `new_message` trigger via the `TriggerService`, passing a payload containing the channel ID, message content, and author details.

## 4. Reactions

Reactions are executed by making calls to the Discord REST API using the bot's token.

- `DiscordService`: The `back/src/auth/discord/discord.service.ts` contains the logic for reactions.
- `send_message` Reaction: This method takes a `channelId` and `message` from the workflow configuration. It makes a `POST` request to the Discord API (`/channels/{channelId}/messages`) to send the message. The `DISCORD_BOT_TOKEN` is used for authorization.

## 5. Implementation notes

- `DISCORD_BOT_TOKEN`: This is a critical environment variable. The bot will not be able to log in or send messages without it.
- Gateway Intents: The bot requires specific Gateway Intents to receive events. This is configured in `gateway.service.ts` and includes `Guilds`, `GuildMessages`, and `MessageContent`.
- Permissions: When a user adds the bot to their server via the OAuth2 flow, the `permissions=3072` parameter in `discord.strategy.ts` grants it the necessary "View Channels" and "Send Messages" permissions.
