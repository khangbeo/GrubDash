// GrubDash frontend. Talks to the GrubDash API in this repo (src/server.js).
// API base: defaults to http://localhost:5000. Override with ?api=<url> in the
// page URL, or set localStorage "grubdash-api" — handy if the API runs elsewhere.
const API_BASE = (
  new URLSearchParams(location.search).get("api") ||
  localStorage.getItem("grubdash-api") ||
  "http://localhost:5000"
).replace(/\/$/, "");

const STATUSES = ["pending", "preparing", "out-for-delivery", "delivered"];

const state = {
  dishes: [],
  orders: [],
  cart: new Map(), // dishId -> quantity
  editingDishId: null,
  apiOnline: false,
};

const $ = (sel) => document.querySelector(sel);
const dishesEl = $("#dishes");
const ordersEl = $("#orders");
const toastEl = $("#toast");

let toastTimer;
function toast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = `toast${isError ? " toast-error" : ""}`;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 3600);
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

// The API wraps everything: success is { data: ... }, errors are { error: msg }.
async function api(path, { method = "GET", data } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: data ? { "Content-Type": "application/json" } : undefined,
      body: data ? JSON.stringify({ data }) : undefined,
    });
  } catch {
    throw new Error(`Can't reach the API at ${API_BASE}`);
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body.data;
}

/* ---------- Tabs ---------- */

function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.tab === name)
  );
  ["menu", "orders", "dish-form"].forEach((n) => {
    document.querySelector(`#tab-${n}`).hidden = n !== name;
  });
}

document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => showTab(t.dataset.tab))
);

/* ---------- Menu ---------- */

function renderDishes() {
  $("#dishesEmpty").hidden = state.dishes.length !== 0;
  dishesEl.innerHTML = "";

  state.dishes.forEach((dish) => {
    const card = document.createElement("article");
    card.className = "dish-card";

    const img = document.createElement("img");
    img.src = dish.image_url;
    img.alt = dish.name;
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());

    const body = document.createElement("div");
    body.className = "dish-body";

    const name = document.createElement("h3");
    name.textContent = dish.name;

    const desc = document.createElement("p");
    desc.className = "description";
    desc.textContent = dish.description;

    const footer = document.createElement("div");
    footer.className = "dish-footer";

    const price = document.createElement("span");
    price.className = "price";
    price.textContent = money(dish.price);

    const qtyInCart = state.cart.get(dish.id) || 0;
    const action = document.createElement("div");
    action.className = "dish-actions";

    if (qtyInCart === 0) {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "btn btn-add";
      add.textContent = "Add";
      add.addEventListener("click", () => setCartQty(dish.id, 1));
      action.append(add);
    } else {
      action.append(stepper(dish.id, qtyInCart));
    }

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn btn-ghost edit-link";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startEditDish(dish));

    footer.append(price, action);
    body.append(name, desc, footer, edit);
    card.append(img, body);
    dishesEl.append(card);
  });
}

function stepper(dishId, qty) {
  const wrap = document.createElement("span");
  wrap.className = "stepper";

  const minus = document.createElement("button");
  minus.type = "button";
  minus.textContent = "−";
  minus.setAttribute("aria-label", "One less");
  minus.addEventListener("click", () => setCartQty(dishId, qty - 1));

  const count = document.createElement("span");
  count.className = "qty";
  count.textContent = qty;

  const plus = document.createElement("button");
  plus.type = "button";
  plus.textContent = "+";
  plus.setAttribute("aria-label", "One more");
  plus.addEventListener("click", () => setCartQty(dishId, qty + 1));

  wrap.append(minus, count, plus);
  return wrap;
}

/* ---------- Cart + checkout ---------- */

function cartEntries() {
  return [...state.cart.entries()]
    .map(([id, quantity]) => {
      const dish = state.dishes.find((d) => d.id === id);
      return dish ? { dish, quantity } : null;
    })
    .filter(Boolean);
}

function setCartQty(dishId, qty) {
  if (qty <= 0) state.cart.delete(dishId);
  else state.cart.set(dishId, qty);
  renderDishes();
  renderCart();
}

function renderCart() {
  const entries = cartEntries();
  const itemsEl = $("#cartItems");
  itemsEl.innerHTML = "";

  $("#cartEmpty").hidden = entries.length !== 0;
  $("#cartTotalRow").hidden = entries.length === 0;
  $("#placeOrder").disabled = entries.length === 0;

  let total = 0;
  entries.forEach(({ dish, quantity }) => {
    total += dish.price * quantity;
    const line = document.createElement("div");
    line.className = "cart-line";

    const name = document.createElement("span");
    name.className = "line-name";
    name.textContent = dish.name;

    const price = document.createElement("span");
    price.className = "line-price";
    price.textContent = money(dish.price * quantity);

    line.append(name, stepper(dish.id, quantity), price);
    itemsEl.append(line);
  });
  $("#cartTotal").textContent = money(total);
}

$("#checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const entries = cartEntries();
  if (!entries.length) return;

  const data = {
    deliverTo: $("#deliverTo").value.trim(),
    mobileNumber: $("#mobileNumber").value.trim(),
    status: "pending",
    dishes: entries.map(({ dish, quantity }) => ({ ...dish, quantity })),
  };

  try {
    const order = await api("/orders", { method: "POST", data });
    state.cart.clear();
    e.target.reset();
    renderDishes();
    renderCart();
    await loadOrders();
    toast(`Order placed. Order ${String(order.id).slice(0, 8)} is pending.`);
    showTab("orders");
  } catch (err) {
    toast(err.message, true);
  }
});

/* ---------- Orders ---------- */

function orderTotal(order) {
  return order.dishes.reduce((sum, d) => sum + d.price * d.quantity, 0);
}

function renderOrders() {
  $("#ordersEmpty").hidden = state.orders.length !== 0;
  const badge = $("#orderCount");
  badge.hidden = state.orders.length === 0;
  badge.textContent = state.orders.length;
  ordersEl.innerHTML = "";

  state.orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "order-card";

    const head = document.createElement("div");
    head.className = "order-head";

    const id = document.createElement("span");
    id.className = "order-id";
    id.textContent = `Order ${String(order.id).slice(0, 8)}`;

    const pill = document.createElement("span");
    pill.className = `pill pill-${order.status}`;
    pill.textContent = order.status.replace(/-/g, " ");

    head.append(id, pill);

    const meta = document.createElement("p");
    meta.className = "order-meta";
    meta.textContent = `${order.deliverTo} · ${order.mobileNumber}`;

    const items = document.createElement("ul");
    items.className = "order-items";
    order.dishes.forEach((d) => {
      const li = document.createElement("li");
      const left = document.createElement("span");
      left.textContent = `${d.quantity} × ${d.name}`;
      const right = document.createElement("span");
      right.textContent = money(d.price * d.quantity);
      li.append(left, right);
      items.append(li);
    });

    const controls = document.createElement("div");
    controls.className = "order-controls";

    const statusSelect = document.createElement("select");
    statusSelect.setAttribute("aria-label", "Order status");
    STATUSES.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s.replace(/-/g, " ");
      opt.selected = s === order.status;
      statusSelect.append(opt);
    });
    statusSelect.addEventListener("change", () => updateOrderStatus(order, statusSelect.value));

    const total = document.createElement("span");
    total.className = "order-total";
    total.textContent = money(orderTotal(order));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-ghost btn-danger";
    del.textContent = "Delete";
    del.disabled = order.status !== "pending";
    del.title =
      order.status !== "pending"
        ? "The API only lets you delete a pending order"
        : "Delete this order";
    del.addEventListener("click", () => deleteOrder(order));

    controls.append(statusSelect, total, del);
    card.append(head, meta, items, controls);
    ordersEl.append(card);
  });
}

async function updateOrderStatus(order, status) {
  try {
    // The API's PUT requires the full order back, not just the status.
    const updated = await api(`/orders/${order.id}`, {
      method: "PUT",
      data: {
        id: order.id,
        deliverTo: order.deliverTo,
        mobileNumber: order.mobileNumber,
        status,
        dishes: order.dishes,
      },
    });
    Object.assign(order, updated);
    renderOrders();
    toast(`Order ${String(order.id).slice(0, 8)} is now ${status.replace(/-/g, " ")}.`);
  } catch (err) {
    toast(err.message, true);
    renderOrders();
  }
}

async function deleteOrder(order) {
  try {
    await api(`/orders/${order.id}`, { method: "DELETE" });
    state.orders = state.orders.filter((o) => o.id !== order.id);
    renderOrders();
    toast("Order deleted.");
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------- Add / edit dish ---------- */

function startEditDish(dish) {
  state.editingDishId = dish.id;
  $("#dishName").value = dish.name;
  $("#dishDescription").value = dish.description;
  $("#dishPrice").value = dish.price;
  $("#dishImage").value = dish.image_url;
  $("#dishFormTitle").textContent = "Edit dish";
  $("#dishSubmit").textContent = "Save changes";
  $("#dishCancel").hidden = false;
  showTab("dish-form");
}

function resetDishForm() {
  state.editingDishId = null;
  $("#dishForm").reset();
  $("#dishFormTitle").textContent = "Add a dish";
  $("#dishSubmit").textContent = "Add dish";
  $("#dishCancel").hidden = true;
}

$("#dishCancel").addEventListener("click", () => {
  resetDishForm();
  showTab("menu");
});

$("#dishForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: $("#dishName").value.trim(),
    description: $("#dishDescription").value.trim(),
    price: Number($("#dishPrice").value),
    image_url: $("#dishImage").value.trim(),
  };

  try {
    if (state.editingDishId) {
      const updated = await api(`/dishes/${state.editingDishId}`, {
        method: "PUT",
        data: { id: state.editingDishId, ...data },
      });
      const i = state.dishes.findIndex((d) => d.id === updated.id);
      if (i > -1) state.dishes[i] = updated;
      toast(`Updated ${updated.name}.`);
    } else {
      const created = await api("/dishes", { method: "POST", data });
      state.dishes.push(created);
      toast(`Added ${created.name} to the menu.`);
    }
    resetDishForm();
    renderDishes();
    renderCart();
    showTab("menu");
  } catch (err) {
    toast(err.message, true);
  }
});

/* ---------- Load ---------- */

async function loadOrders() {
  state.orders = await api("/orders");
  renderOrders();
}

async function loadAll() {
  try {
    state.dishes = await api("/dishes");
    await loadOrders();
    state.apiOnline = true;
    $("#apiBanner").hidden = true;
    $("#apiBaseLabel").textContent = API_BASE;
    renderDishes();
    renderCart();
  } catch {
    state.apiOnline = false;
    $("#apiBaseLabel").textContent = API_BASE;
    $("#apiBanner").hidden = false;
    renderDishes();
    renderCart();
    renderOrders();
  }
}

$("#retryApi").addEventListener("click", loadAll);

loadAll();
