# Frontend notes

## Project structure

- `frontend/` contains the React + Vite client application.
- `frontend/src/App.jsx` defines the router and top-level providers.
- `frontend/src/components/` contains the shared shell, sidebar, top bar, and reusable UI primitives.
- `frontend/src/pages/` contains screen-level route components.
- `frontend/src/context/` holds auth state.
- `frontend/src/lib/` contains the API client and shared request methods.
- `frontend/src/routes/` contains permission guards.
- `backend/public/app/` is the production build output for the SPA served by Laravel.

## Authentication flow

- The app uses Axios with `withCredentials: true`.
- Before login, it requests a CSRF cookie from `/sanctum/csrf-cookie`.
- On a `401` response, the app redirects to `/login?reason=session_expired`.
- On startup, `GET /api/auth/me` is called once and the profile is stored in the auth context.
- `RequirePermission` blocks protected routes until the user session is loaded.
- The UI hides unsupported navigation items, but the server remains the real authority.

## Running locally

From the project root:

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` and `/sanctum` to `http://127.0.0.1:8000`.

## Production build

```bash
cd frontend
npm run build
```

The Vite config outputs the production bundle to `backend/public/app`, and the Laravel route forwards `/app` and nested routes to `public/app/index.html` so deep links work.

## Notes

- The SPA is built to run under the `/app` base path.
- The app uses React Router, TanStack Query, Axios, and a small shared design system consistent with the provided dashboard reference.
- When the real Laravel API contract becomes available, replace the demo data in `src/lib/api.js` with real endpoints only from the documented backend contract.
