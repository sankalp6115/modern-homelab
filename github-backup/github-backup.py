import os
import shutil
import subprocess
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

import requests

PAT = os.environ.get("GITHUB_PAT")

BASE_DIR = Path(r"C:\Users\ujjwa\Desktop\som\termux-bootstrap\github-backup")
REPOS_DIR = BASE_DIR / "repos"
ARCHIVE_DIR = BASE_DIR / "archive"

URL = "https://api.github.com/user/repos"
HEADERS = {
    "Authorization": f"Bearer {PAT}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

PARAMS = {
    "visibility": "all",
    "per_page": 100,
    "page": 1,
    "sort": "updated",
}

def repo_dir_name(repo):
    return f"{repo['full_name'].replace('/', '__')}.git"

def fetch_all_repos():
    all_repos = []
    page = 1

    while True:
        params = dict(PARAMS)
        params["page"] = page
        r = requests.get(URL, headers=HEADERS, params=params, timeout=60)
        r.raise_for_status()
        data = r.json()
        if not data:
            break
        all_repos.extend(data)
        page += 1

    return all_repos

def clone_mirror(repo, target_dir):
    clone_url = repo["clone_url"].replace(
        "https://",
        f"https://x-access-token:{PAT}@"
    )
    subprocess.run(
        ["git", "clone", "--mirror", clone_url, str(target_dir)],
        check=True
    )

def update_mirror(repo_dir):
    subprocess.run(
        ["git", "-C", str(repo_dir), "remote", "update", "--prune"],
        check=True
    )

def archive_repo(repo_dir):
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    target = ARCHIVE_DIR / repo_dir.name
    if target.exists():
        shutil.rmtree(target)
    shutil.move(str(repo_dir), str(target))

def main():
    REPOS_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    repos = fetch_all_repos()
    remote_names = {repo_dir_name(repo) for repo in repos}

    local_repos = {
        p.name for p in REPOS_DIR.iterdir()
        if p.is_dir() and p.name.endswith(".git")
    }

    repo_map = {repo_dir_name(repo): repo for repo in repos}

    for name, repo in repo_map.items():
        target = REPOS_DIR / name
        if target.exists():
            print(f"Updating {name}")
            update_mirror(target)
        else:
            print(f"Cloning {name}")
            clone_mirror(repo, target)

    for local_name in local_repos - remote_names:
        print(f"Archiving deleted repo {local_name}")
        archive_repo(REPOS_DIR / local_name)

if __name__ == "__main__":
    main()