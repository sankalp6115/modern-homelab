# 💬 Quotes API

A minimal FastAPI server that returns a random quote every time you hit the endpoint. Simple, clean, and useful as a building block for dashboards or other apps.

---

## What It Does

Hit `GET /quote` and get back a random quote with its author — as JSON.

```json
{
  "quote": "The only way to do great work is to love what you do.",
  "author": "Steve Jobs"
}
```

---

## How It Works

- On startup, the server loads `quotes.json` (a large collection of quotes) into memory once
- Every request to `/quote` picks a random entry from that in-memory list and returns it
- No database, no disk reads per request — just fast in-memory random selection

### Why load on startup?
Reading a file from disk on every request is slow. Instead, FastAPI's `@app.on_event("startup")` hook lets you run code once when the server starts and store the result in `app.state`. All subsequent requests share that data.

---

## File Structure

```
quotes/
├── server.py       # FastAPI app with /quote endpoint
├── quotes.json     # Dataset of quotes (loaded at startup)
└── README.md       # This file
```

---

## Running

```bash
pip install fastapi uvicorn
uvicorn server:app --host 0.0.0.0 --port 8001
```

Then visit:
```
http://localhost:8001/quote
```

Or from another device on your network:
```
http://YOUR_IP:8001/quote
```

---

## Extending This

Some ideas for building on top of this:

- Add a `GET /quote?author=Einstein` query param to filter by author
- Add a `GET /quote/random-n?count=5` endpoint to return multiple quotes
- Integrate it into the **statistic** dashboard to show a quote of the day
- Add a simple HTML frontend that displays a quote with a refresh button

---

## Key Concepts

### FastAPI startup event
```python
@app.on_event("startup")
def json_load():
    with open("quotes.json", "r") as file:
        app.state.quotes = json.load(file)
```
This runs once when the server boots. The quotes list lives in `app.state` for the lifetime of the server.

### app.state
FastAPI's built-in way to store shared state across requests. Anything you put in `app.state` during startup is accessible in every request handler.

### random.choice()
Python's standard library function to pick a random element from a list. Fast and simple — no need for anything more complex.
