# 📥 Idea Inbox

A dead-simple cross-device scratchpad. Whatever you type in the browser is saved to the server. Open it on another device — your text is right there.

Think of it as a persistent sticky note that lives on your homelab.

---

## What It Does

- Type anything in the text area
- Text is **automatically saved** to the server on every change
- Open the same page on any other device on your network — your text syncs instantly
- Useful for quickly jotting ideas, copying text between devices, or keeping a shared note

---

## How It Works

```
Browser (any device)           Server (Node.js + Express)
       |                               |
       |--- GET /api/text ------------>| reads data.txt
       |<-- { text: "..." } ----------|
       |                               |
       |--- POST /api/text ----------->| writes to data.txt
       |    { text: "new content" }    |
```

### Backend (`server/index.js`)
- Built with **Node.js** and **Express**
- Two endpoints:
  - `GET /api/text` — reads `data.txt` and returns the content as JSON
  - `POST /api/text` — receives new text in the request body and writes it to `data.txt`
- Text is stored in a plain file (`data.txt`) — no database needed

### Frontend (`client/script.js`)
- Loads current text from the server on page load
- Listens for `change` events on the text area
- On every change, sends the new text to the server via `POST /api/text`

---

## File Structure

```
idea-inbox/
├── server/
│   ├── index.js         # Express server (read/write API)
│   ├── fileService.js   # File read/write helpers
│   └── data.txt         # Persistent text storage
├── client/
│   ├── index.html       # Browser UI
│   └── script.js        # Frontend logic (fetch + save)
├── package.json
└── README.md            # This file
```

---

## Running

```bash
npm install
node server/index.js
```

Then open `client/index.html` in your browser.

To access from another device on your network, you'll need to update the API URL in `script.js`:
```js
const API = "http://YOUR_SERVER_IP:3000/api/text";
```

---

## Key Concepts

### Node.js
Lets you run JavaScript outside the browser — on the server. Same language, different environment.

### Express
A minimal web framework for Node.js. Makes it easy to define routes (`GET /api/text`, `POST /api/text`) and handle HTTP requests.

### REST API
A style of API design where:
- `GET` = read data
- `POST` = create/update data
- Each resource (like `/api/text`) maps to one piece of data

### File I/O as a database
For a simple app like this, a plain text file is all you need. No SQLite, no Postgres — just `fs.readFile` and `fs.writeFile`.
