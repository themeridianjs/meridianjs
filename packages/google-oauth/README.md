# @meridianjs/google-oauth

Google OAuth 2.0 module for MeridianJS. Adds `GET /auth/google` and `GET /auth/google/callback` routes that authenticate users via Google, then issue a MeridianJS JWT.

## Installation

```bash
npm install @meridianjs/google-oauth
```

## Configuration

```typescript
// meridian.config.ts
export default defineConfig({
  modules: [
    {
      resolve: "@meridianjs/google-oauth",
      options: {
        clientId:     process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        callbackUrl:  process.env.GOOGLE_REDIRECT_URI ?? "",
        frontendUrl:  process.env.APP_URL,
      },
    },
  ],
})
```

Add to your `.env`:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:9000/auth/google/callback
APP_URL=http://localhost:5174
```

`GOOGLE_REDIRECT_URI` must also be registered as an **Authorised redirect URI** in the [Google Cloud Console](https://console.cloud.google.com/) for your OAuth 2.0 client.

## How It Works

1. User visits `GET /auth/google` → redirected to Google consent screen.
2. After consent, Google redirects to `GOOGLE_REDIRECT_URI`.
3. The framework exchanges the code for a Google profile.
4. If a user with the matching Google ID exists, they are logged in. Otherwise, a new account is created using the Google profile data.
5. If the callback URL included an `invite` query parameter, the user is automatically added to the invited workspace.
6. A MeridianJS JWT is issued and the user is redirected to `APP_URL` with the token in the query string.

## Production

In production, update your `.env` with the public URLs:

```bash
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback
APP_URL=https://app.yourdomain.com
```

And update the authorised redirect URIs in the Google Cloud Console to match.

## License

MIT
