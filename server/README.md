# IUH Event API

Express API and MongoDB Atlas backend for the remote app mode. The Expo app must call this API; never put `MONGODB_URI` or `JWT_SECRET` in the mobile app.

## Setup

1. Install dependencies from this directory with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters.
3. In MongoDB Atlas, create a database user with access only to the `iuh_event` database and allow the server's network address.
4. Run `npm run seed:events` to import the 12 sample events from `../mock-api/events.json`.
5. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), `ADMIN_NAME`, and `ADMIN_STUDENT_ID`, then run `npm run seed:admin`.
6. Start the API with `npm run dev`. Health check: `GET http://localhost:3000/health`.

To enable email password recovery, also configure `RESEND_API_KEY` and `PASSWORD_RESET_FROM` in `server/.env`. Keep the Resend key on the server only. Without these values, the API reports password recovery as not configured.

The admin seed script never prints or stores its password in source control. Re-running it is safe; it does not overwrite an existing admin account.

## Scripts

- `npm run dev`: start the TypeScript API with reload.
- `npm run build`: compile to `dist/`.
- `npm start`: run the compiled API.
- `npm run seed:events`: insert missing sample events without overwriting admin edits.
- `npm run seed:admin`: create the first remote admin from environment variables.
- `npm test`: run auth/security unit tests.

## API contract

The single source of truth for endpoints, request/response schemas, roles, statuses, validation, and error codes is [`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md). Update it in the same pull request whenever the API contract changes.

Admin access is enforced by middleware from the current database user on every protected request; the client-supplied role is never trusted. Event deletion is archival and user deletion is suspension so registration history remains intact.

Set the Expo app's `EXPO_PUBLIC_APP_MODE=remote` and `EXPO_PUBLIC_API_URL` to this server's reachable URL. For a physical phone, use the development computer's LAN IP, not `localhost`.
