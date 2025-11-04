# Backend API reference

The AREA backend exposes a RESTful API for all client interactions.

- Base URL: Most endpoints are prefixed with `/api` (e.g., `/api/user/login`). Public endpoints like `/about.json` are an exception.
- Authentication: Most endpoints are protected and require a JWT. The token must be sent in the `Authorization` header as `Bearer <TOKEN>`.

### `about.json`

Provides public metadata about the server and its available services, actions, and reactions.

- Endpoint: `GET /about.json`
- Access: Public
- Description: Returns a JSON object detailing the server's current time and a list of all configured services with their respective actions and reactions. This is used by clients to discover available automation options.

- Success response: `200 OK`
```json
{
  "client": {
    "host": "127.0.0.1"
  },
  "server": {
    "current_time": 1672531200,
    "services": [
      {
        "name": "github",
        "actions": [
          { "name": "push", "description": "A push is made to a repository" }
        ],
        "reactions": [
          { "name": "create_issue", "description": "Create an issue on a repository" }
        ]
      }
    ]
  }
}
```

### Authentication and user (`/api/user`)

Handles user registration, login, and account management.

#### 1. Register user

- Endpoint: `POST /api/user/register`
- Access: Public
- Description: Creates a new user account.

- Request body (`CreateUserDto`)
```json
{
  "username": "new_user",
  "email": "user@example.com",
  "password": "password123"
}
```

- Success response: `201 Created` - Returns the newly created user object (without the password).

#### 2. Login user

- Endpoint: `POST /api/user/login`
- Access: Public
- Description: Authenticates a user and returns a JWT.

- Request body (`LoginUserDto`)
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- Success response: `200 OK`
```json
{
  "user": {
    "id": 1,
    "username": "new_user",
    "email": "user@example.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Update user

- Endpoint: `PATCH /api/user`
- Access: Authenticated user
- Description: Updates the authenticated user's profile (username, email, or password).

- Request body (`EditUserDto`)
```json
{
  "username": "updated_username",
  "password": "new_strong_password"
}
```

- Success response: `200 OK` - Returns the updated user object.

#### 4. Delete user

- Endpoint: `DELETE /api/user`
- Access: Authenticated user
- Description: Deletes the authenticated user's account and all associated data.
- Success response: `200 OK`
```json
{
  "message": "User with id 1 deleted successfully"
}
```

#### 5. Get connected services

- Endpoint: `GET /api/user/connections`
- Access: Authenticated user
- Description: Retrieves a list of service names that the authenticated user has connected to their account.
- Success response: `200 OK`
```json
[
  "github",
  "google"
]
```

#### 6. List all users

- Endpoint: `GET /api/user/list`
- Access: Admin only
- Description: Retrieves a list of all users in the system.
- Success response: `200 OK` - Returns an array of user objects.

### Metadata (`/api/services`, `/api/actions`, `/api/reactions`)

Provides data about available services and their components.

#### 1. List services

- Endpoint: `GET /api/services`
- Access: Public
- Description: Retrieves a list of all available services.
- Success response: `200 OK`
```json
[
  {
    "id": 1,
    "name": "github",
    "description": "Actions and reactions for GitHub."
  }
]
```

#### 2. List actions for a service

- Endpoint: `GET /api/actions/:serviceId`
- Access: Public
- Description: Retrieves all available actions for a specific service.
- Success response: `200 OK`
```json
[
  {
    "id": 1,
    "name": "push",
    "jsonFormat": { "owner": "string", "repo": "string", "branch": "string" }
  }
]
```

#### 3. List reactions for a service

- Endpoint: `GET /api/reactions/:serviceId`
- Access: Public
- Description: Retrieves all available reactions for a specific service.
- Success response: `200 OK`
```json
[
  {
    "id": 1,
    "name": "create_issue",
    "jsonFormat": { "owner": "string", "repo": "string", "title": "string", "body": "string" }
  }
]
```

### Workflows (`/api/workflow`)

Manages user-created workflows. All endpoints require JWT authentication.

#### 1. List workflows

- Endpoint: `GET /api/workflow/list`
- Access: Authenticated user
- Description: Retrieves all workflows belonging to the authenticated user.
- Success response: `200 OK`
```json
[
  {
    "id": 1,
    "toggle": true,
    "action": {
      "actionId": 1,
      "serviceId": 1,
      "actionBody": { "repo": "owner/repo" }
    },
    "reactions": [
      {
        "reactionId": 1,
        "serviceId": 1,
        "reactionBody": { "title": "New push", "body": "A push was made." }
      }
    ]
  }
]
```

#### 2. Create workflow

- Endpoint: `POST /api/workflow/create`
- Access: Authenticated user
- Description: Creates a new workflow.

- Request body (`CreateWorkflowDto`)
```json
{
  "toggle": true,
  "action": {
    "serviceId": 1,
    "actionId": 1,
    "actionBody": { "owner": "owner", "repo": "repo", "branch": "main" }
  },
  "reactions": [
    {
      "serviceId": 2,
      "reactionId": 1,
      "reactionBody": { "to": "admin@example.com", "message": "New push received!" }
    }
  ]
}
```
- Success response: `201 Created` - Returns the created `WorkflowDto` object.

#### 3. Update workflow

- Endpoint: `PATCH /api/workflow/edit/:id`
- Access: Authenticated user (Owner)
- Description: Updates an existing workflow.

- Request body (`UpdateWorkflowDto`)
```json
{
  "toggle": false,
  "action": {
    "actionId": 2,
    "actionBody": { "repo": "owner/another-repo" }
  }
}
```
- Success response: `200 OK` - Returns the updated `WorkflowDto` object.

#### 4. Delete workflow

- Endpoint: `DELETE /api/workflow/delete/:id`
- Access: Authenticated user (Owner)
- Description: Deletes a workflow.
- Success response: `200 OK` - Returns the `WorkflowDto` of the deleted workflow.

### OAuth2 and webhooks

Handles external service authentication and incoming webhooks. These endpoints are primarily for browser redirects and server-to-server communication.

To support development with dynamic URLs, the project uses a central proxy service (`p.3z.ee`) when `TUNNEL=true` is set in the `.env` file. This proxy provides stable public endpoints for OAuth and webhooks, routing requests back to the correct developer's local instance.

#### Google and Gmail

- `GET /auth/google`: Initiates the Google OAuth2 flow. When tunneling is enabled, this redirects through the external OAuth proxy.
- `GET /auth/google/callback`: Handles the callback from Google (or the proxy) after user consent.
- `POST /api/google/webhook`: Receives Google Cloud Pub/Sub push notifications for new emails.

#### GitHub

- `GET /auth/github`: Initiates the GitHub OAuth2 flow. When tunneling is enabled, this redirects through the external OAuth proxy.
- `GET /auth/github/callback`: Handles the callback from GitHub (or the proxy).
- `POST /auth/github/webhooks`: Receives webhook events from GitHub. When tunneling is enabled, external services send webhooks to a central broadcast URL (`https://p.3z.ee/broadcast-webhook/auth/github/webhooks`). This proxy then forwards the request to all active developer tunnels. The backend validates the `X-Hub-Signature-256` header for security.
