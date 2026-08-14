## GotifyAPI Abstraction
This repository contains python scripts to abstract the process of sending notifications from a Gotify Server to a client using simple python statements.

### Instructions to use:
- git clone https://github.com/sankalp6115/homelab-gotify
- cd homelab-gotify
- pip install -e .

#### Sending a notification has three parameters:
- **Title**: short title of what the notification and its source.
- **Description**: Main content of notification. 
- **Priority**: An integer value that determines notification's importance. Higher values result in higher-priority notifications on supported Gotify Clients (such as android).

### Documentation

```python
from gotify import Gotify

gotify = Gotify(server,token)

gotify.send(title, message, priority_level)

gotify.send("Server", "Nightly Backup Completed")
```

#### Other Methods

```python
gotify.success("Server", "Inference Completed Successfully") # Priority = 4
gotify.info("Jellyfin","Movie upload started") # Priority = 3
gotify.warning("Server","90% Storage Full") # Priority = 7
gotify.error("Server","Syncing Failed, Internet Outage") # Priority = 10
```

### Contribution:

Contributions are welcome! This is a homelab utility, so keep changes minimal and focused.

**Ways to contribute:**
- **Bug reports** — Open an issue describing the problem, your OS, Python version, and Gotify server version.
- **Feature requests** — Open an issue with a clear use-case. Preference given to things that keep the library lightweight.
- **Pull requests** — Fork the repo, make your changes on a new branch, and open a PR against `main`.

**Guidelines:**
- Keep the API simple — `send()`, `success()`, `info()`, `warning()`, `error()` should stay the primary interface.
- No new required dependencies — `requests` and `python-dotenv` are the only allowed deps.
- Test your changes manually against a running Gotify server before submitting.
