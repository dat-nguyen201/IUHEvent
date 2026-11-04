# Remote Authentication

The app keeps its local demo authentication and adds a remote mode backed by the team's API.

## Configure the app

Copy `.env.example` to `.env` and set:

- `EXPO_PUBLIC_APP_MODE=demo` to use local demo accounts and local storage.
- `EXPO_PUBLIC_APP_MODE=remote` to use the API.
- `EXPO_PUBLIC_API_URL` to the API origin, such as `http://localhost:3000` for web or a reachable LAN/emulator address for a device.

Restart Expo after changing environment values. If mode is omitted, the app uses `demo`. Remote mode never falls back to demo when the API is unavailable.

## API contract

- `POST /api/auth/register` accepts `{ name, studentId, email, password }`.
- `POST /api/auth/login` accepts `{ email, password }`.
- Both return `{ accessToken, user }`.
- `GET /api/auth/me` accepts a bearer token and returns `{ user }`.
- `user` contains `id`, `name`, `studentId`, `email`, `major`, `role`, and `status`.
- `role` is `student` or `admin`; `status` is `active` or `suspended`.
- Error responses may use `{ code, message }` or `{ error: { code, message } }`.

The app stores the remote access token under a separate key from the local demo session. On HTTP 401 it clears the remote token. Network and timeout errors preserve the current screen and are shown for retry.

## Smoke tests

Import `postman/remote-auth.postman_collection.json` into Postman. Set test-only values for `email`, `password`, `name`, and `studentId`; run Register or Login before Get current user. Do not put real credentials or tokens in a committed Postman environment.
