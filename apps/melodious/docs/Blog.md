# From a Student Project to My Own 24×7 Spotify: Building a Self-Hosted Music Streaming System

Most projects end where they start—inside a folder, never used again.

This one didn’t.

What began as a simple attempt to build a music player has now turned into a **self-hosted, always-on streaming system**—running continuously on an old phone, accessible anytime, with full control over features, behavior, and experience.

This is not just a “Spotify clone.”
It’s a system built out of frustration, refined through failures, and now used daily.

---

## Why I Started This

The trigger was simple:

Spotify wasn’t behaving like a music player anymore—it was behaving like a feedback loop.

- The same songs kept repeating
- “Shuffle” wasn’t actually random
- Less-played songs became invisible

Over time, my own music library started feeling limited—not because it was small, but because the platform decided what I should hear.

So the goal became clear:

> Build a system where _I control discovery, playback, and behavior completely._

---

## The First Attempt (And Why It Failed)

Initially, I built everything using:

- HTML
- CSS
- Vanilla JavaScript

It worked—but only for a while.

As features grew, problems started compounding:

- Managing assets (songs, images, metadata) became messy
- Shared components across pages became inconsistent
- State was difficult to synchronize
- UI updates were fragile and repetitive

At one point, the project became so tangled that continuing felt pointless.

That was the closest point to abandoning it.

---

## The Shift in Approach

Instead of forcing the same structure, I redesigned the system properly.

### Final Stack

- **Frontend:** ReactJS
- **Backend:** Python FastAPI
- **Database:** SQLite

This separation changed everything.

---

## Architecture Overview

The system now follows a **decoupled client–server model**:

- React frontend handles UI and interactions
- FastAPI backend handles:
  - Streaming music
  - Serving metadata (songs, playlists, assets)
  - Managing logic (shuffle, search, etc.)
- SQLite stores structured data

The frontend communicates with the backend through API calls.

This solved:

- State inconsistency
- Asset management chaos
- Tight coupling between UI and logic

---

## Core Features

The system now supports:

- Play / Pause
- Next / Previous
- Shuffle (actual shuffle, not biased repetition)
- Repeat modes
- Search (including fuzzy search)
- Playlists and custom playlists
- Backend-driven streaming
- Album art and metadata mapping

---

## Advanced Features

Beyond the basics, some features pushed this into a more complete system:

### Voice Control

Control playback using voice commands.

### Fuzzy Search

Search doesn’t rely on exact matches—useful for large libraries.

### Time-Synced Lyrics

Lyrics stay aligned with playback time.

### Easter Eggs

Hidden interactions and surprises built into the UI—small details that make the app feel personal.

---

## Hosting: Turning an Old Phone into a 24×7 Server

Instead of relying on cloud infrastructure, I used something unconventional:

**An old phone.**

### How it works

- Installed Termux (a Linux-like environment on Android)
- Ran both frontend and backend inside it
- Kept the device plugged in and always running

Effectively:

> The phone became a lightweight server.

---

## Learning SSH and Remote Control

To manage the system efficiently, I started using:

- **SSH** → to run commands on the phone from my laptop
- **SCP** → to transfer files and updates

This removed the need to interact directly with the phone.

Now I can:

- Deploy changes
- Restart services
- Debug issues

—all remotely.

This was one of the most practical skills gained from the project.

---

## Challenges Faced

### 1. Path and Asset Management

Handling file paths across:

- Songs
- Album art
- Metadata

was error-prone.

Small inconsistencies broke rendering.

---

### 2. Rendering Large Music Tables

Displaying a structured music library with:

- Images
- Metadata
- Controls

required careful mapping and efficient rendering.

---

### 3. Data Mapping

Linking:

- Songs → album art
- Songs → lyrics
- Songs → playlists

had to be consistent across backend and frontend.

Any mismatch caused visible bugs.

---

## What Changed When It Became “Real”

The biggest shift wasn’t technical—it was psychological.

Once the system started running **24×7 and was actually used daily**, priorities changed:

- Bugs became more important than features
- Stability mattered more than experimentation
- Small UX issues became obvious immediately

It stopped being a “project” and became a **product I depend on**.

---

## What Makes It Different from Spotify

- No algorithm controlling what plays
- True shuffle behavior
- Full ownership of data and features
- Custom features (voice control, lyrics, easter eggs)
- No external dependency

---

## Future Direction (Not Immediate)

Planned improvements include:

- Mood-based playlists
- Automatic taste-based playlist generation
- Pagination and lazy loading
- Optimization for low-end devices

But none of these are urgent.

The system is already usable—and that matters more.

---

## How You Can Build Something Similar

If you want to replicate this, focus on structure early:

1.  Separate frontend and backend from the beginning
2.  Use a lightweight backend like FastAPI
3.  Keep your data structured (even simple SQLite works)
4.  Avoid overcomplicating UI state—use a proper framework (React helps)
5.  Think about _usage_, not just features

For hosting:

- You don’t need cloud servers
- Even an old device can work
- Learn SSH—it makes everything easier

---

## Final Thought

Most student projects are built to be submitted.

This one was built to be used.

That single difference changes how you design, build, and evolve software.

And once you experience using something you built every day,
you stop building for completion—and start building for quality.
