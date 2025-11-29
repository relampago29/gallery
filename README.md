This project is built with [Next.js](https://nextjs.org) (App Router) and targets Firebase/Vercel hosting with Google OAuth via NextAuth.

## Getting Started

1. Install dependencies with `npm install`.
2. Copy `.env.production` into `.env.local` (or create it from scratch) and fill in every secret that you need for local development.
3. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Firebase Authentication configuration

- `NEXTAUTH_URL` **must exactly match** the public host that users access. Production uses `https://www.momentos.work`, so the `.env.production` file already reflects that value. Update the environment variable inside your hosting provider (Vercel/Firebase) whenever the canonical domain changes and redeploy afterwards.
- In the Firebase Console (`Authentication ➜ Sign-in method`) enable the Google provider and make sure the authorized domains list contains `www.momentos.work`, `momentos.work` and any other environments you expose (e.g. `localhost` for development). This is the only place where Google OAuth needs to be configured now.
- The login page signs in with Firebase (Google popup or email/password) and then exchanges the resulting ID token with NextAuth through the Credentials provider to mint the secure session cookie that the middleware/API routes expect. If you ever reset the Firebase credentials, remember to keep the public keys in `.env.*` in sync.

Following these steps the “Entrar com Google” button on `/[locale]/login` works directly with Firebase Auth and no longer depends on a `redirect_uri` configuration in Google Cloud Console.
