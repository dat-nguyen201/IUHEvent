# IUH Event API

Express API and MongoDB Atlas backend for the remote app mode. The Expo app must call this API; never put `MONGODB_URI` or `JWT_SECRET` in the mobile app.

## Setup

1. Install dependencies from this directory with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters.
3. In MongoDB Atlas, create a database user with access only to the `iuh_event` database and allow the server's network address.
4. Run `npm run seed:events` to import the 12 sample events from `../mock-api/events.json`.
5. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), `ADMIN_NAME`, and `ADMIN_STUDENT_ID`, then run `npm run seed:admin`.
6. Start the API with `npm run dev`. Health check: `GET http://localhost:3000/health`.

The admin seed script never prints or stores its password in source control. Re-running it is safe; it does not overwrite an existing admin account.

## Scripts

- `npm run dev`: start the TypeScript API with reload.
- `npm run build`: compile to `dist/`.
- `npm start`: run the compiled API.
- `npm run seed:events`: insert missing sample events without overwriting admin edits.
- `npm run seed:admin`: create the first remote admin from environment variables.
- `npm test`: run auth/security unit tests.

## API

Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.

Events: `GET /api/events?page=1&pageSize=10&query=&category=&upcomingOnly=false`, `GET /api/events/:eventId`.

Admin events: `GET/POST /api/admin/events`, `GET/PATCH /api/admin/events/:eventId`, `PATCH /api/admin/events/:eventId/status`.

Admin users: `GET /api/admin/users`, `GET /api/admin/users/:userId`, `PATCH /api/admin/users/:userId/profile`, `PATCH /api/admin/users/:userId/status`.

Current user: `GET/PATCH /api/me/profile`, `GET /api/me/saved-events`, `POST/DELETE /api/me/saved-events/:eventId`, `GET /api/me/registrations`, `POST/DELETE /api/me/registrations/:eventId`, `POST /api/me/registrations/:eventId/check-in`.

All errors use `{ "code": "...", "message": "..." }`. Admin access is enforced by middleware from the current database user on every protected request; the client-supplied role is never trusted. Event deletion is archival and user deletion is suspension so registration history remains intact.

Set the Expo app's `EXPO_PUBLIC_APP_MODE=remote` and `EXPO_PUBLIC_API_URL` to this server's reachable URL. For a physical phone, use the development computer's LAN IP, not `localhost`.
