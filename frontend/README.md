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

If your API runs somewhere other than `http://localhost:5000`, point the frontend at it with a query string, e.g. `http://localhost:8000/?api=https://your-api.example.com`, or run `localStorage.setItem("grubdash-api", "<url>")` in the browser console.

If the API is not running, the page shows a banner saying so, with a Retry button once you have started it.

## What it does

- **Menu** — dish cards from `GET /dishes` with photos, descriptions, and prices. Add dishes to a cart with quantity steppers.
- **Checkout** — delivery address + mobile number, posts the order to `POST /orders` with status `pending`, then jumps to the Orders tab.
- **Orders** — every order from `GET /orders` with its items and total. Change an order's status from the dropdown (the API requires the full order on `PUT /orders/:orderId`, so the frontend sends it back whole). Delete is enabled only for `pending` orders, which is the API's own rule.
- **Add a dish** — form that posts to `POST /dishes`. The Edit button on a dish card reuses the same form with `PUT /dishes/:dishId`.
- Errors from the API (its `{ error: "..." }` messages, like validation failures) are shown as toasts instead of failing silently.

## Notes

- The API stores data in memory (`src/data/`), so orders and dishes you add reset when the server restarts.
- Dish prices are whole dollars in this API, so the price field steps by 1.
