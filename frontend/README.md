# GrubDash frontend

A small frontend for the GrubDash API in this repo, in plain HTML, CSS, and JavaScript. No build step and no dependencies. The backend is unchanged.

## Run it

1. Start the API from the repo root (it listens on port 5000):

   ```bash
   npm install
   npm start
   ```

2. Serve this folder with any static server, for example:

   ```bash
   python3 -m http.server 8000 --directory frontend
   ```

3. Open http://localhost:8000.

The API already enables CORS (`app.use(cors())` in `src/app.js`), so the frontend can call it from a different local port.

Which API the frontend talks to, in order: a `?api=<url>` query string, then `localStorage` key `grubdash-api`, then — when the page is served from GitHub Pages — the public Render deployment (`PUBLIC_API` at the top of `app.js`), and everywhere else `http://localhost:5000`.

If the API is not reachable, the page shows a banner saying so, with a Retry button.

## Public version (GitHub Pages + Render)

The fully public setup has two halves:

1. **API on Render (free).** This repo has a `render.yaml` blueprint. Either click "Deploy to Render" in the root README, or in the Render dashboard choose New -> Blueprint and pick this repo. Render sets `PORT` automatically (the server already reads it). The service is named `grubdash`, so its URL is `https://grubdash.onrender.com` — if you rename it, update `PUBLIC_API` in `app.js` to match. Note the free tier sleeps after about 15 idle minutes; the first request afterwards takes up to a minute to wake it, and the frontend's banner says so.

2. **Frontend on GitHub Pages.** One-time: in the repo's Settings -> Pages, set the source to **GitHub Actions**. The workflow in `.github/workflows/pages.yml` then publishes the `frontend/` folder on every push to main that touches it. The site lands at `https://khangbeo.github.io/GrubDash/`, and because it is served from `github.io`, the frontend automatically uses the Render API instead of localhost.

## What it does

- **Menu** — dish cards from `GET /dishes` with photos, descriptions, and prices. Add dishes to a cart with quantity steppers.
- **Checkout** — delivery address + mobile number, posts the order to `POST /orders` with status `pending`, then jumps to the Orders tab.
- **Orders** — every order from `GET /orders` with its items and total. Change an order's status from the dropdown (the API requires the full order on `PUT /orders/:orderId`, so the frontend sends it back whole). Delete is enabled only for `pending` orders, which is the API's own rule.
- **Add a dish** — form that posts to `POST /dishes`. The Edit button on a dish card reuses the same form with `PUT /dishes/:dishId`.
- Errors from the API (its `{ error: "..." }` messages, like validation failures) are shown as toasts instead of failing silently.

## Notes

- The API stores data in memory (`src/data/`), so orders and dishes you add reset when the server restarts.
- Dish prices are whole dollars in this API, so the price field steps by 1.
