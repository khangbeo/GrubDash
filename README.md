# GrubDash

## Installation
Fork and clone this repo, then run `npm install` for the associated dependencies.

Run `npm start` to start the project 

## Basic Info
I made an API for one of Thinkful's back-end project. The API have two routes and allow users to access the requested data and manipulate specific data using their corresponding id via GET, PUT, POST, DELETE methods.

## Tech Stacks
* Node
* Express
* JavaScript

## Paths

* /dishes  
* /dishes/:dishId  
* /orders  
* /orders/:orderId  

## Frontend

A plain HTML/CSS/JS frontend lives in [`frontend/`](frontend/README.md): menu, cart and checkout, order tracking with status changes, and dish add/edit, all against this API. Start the API with `npm start`, then serve the `frontend/` folder and open it in a browser. See `frontend/README.md` for details.

## Deploy (public version)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/khangbeo/GrubDash)

* **API -> Render (free):** the button above (or New -> Blueprint in Render) uses `render.yaml` in this repo. Render sets `PORT` automatically; the service name `grubdash` gives it the URL `https://grubdash.onrender.com`.
* **Frontend -> GitHub Pages:** set Settings -> Pages source to **GitHub Actions** once; `.github/workflows/pages.yml` publishes `frontend/` on pushes to main. Served from `github.io`, the frontend automatically talks to the Render API. Details in `frontend/README.md`.
