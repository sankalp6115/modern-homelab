import os
import zipfile
import io
import csv
from pathlib import Path
from typing import List, Union, Optional

# Define the root storage directory
BASE_DIR = Path(__file__).parent.resolve()
STORAGE_ROOT = BASE_DIR.parent / "storage"
USERS_FILE = BASE_DIR.parent / "users.csv"

def get_safe_path(relative_path: str, username: str) -> Path:
    """
    Validates and returns an absolute path within STORAGE_ROOT/username.
    Raises ValueError if the path is outside the user's directory.
    """
    # Ensure user directory exists
    user_root = (STORAGE_ROOT / username).resolve()
    user_root.mkdir(parents=True, exist_ok=True)

    # Remove leading slashes and resolve path
    clean_path = relative_path.lstrip("/").lstrip("\\")
    target_path = (user_root / clean_path).resolve()
    
    # Check if target_path starts with user_root
    if not str(target_path).startswith(str(user_root)):
        raise ValueError("Access Denied: Path is outside your storage directory.")
    
    return target_path

def get_relative_path(absolute_path: Union[str, Path], username: str) -> str:
    """
    Returns a path relative to STORAGE_ROOT/username for frontend use.
    """
    user_root = (STORAGE_ROOT / username).resolve()
    return os.path.relpath(absolute_path, user_root)

def create_zip_stream(paths: List[Path]) -> io.BytesIO:
    """
    Creates a ZIP archive in memory containing the specified paths.
    """
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for path in paths:
            if path.is_file():
                zip_file.write(path, path.name)
            elif path.is_dir():
                for root, dirs, files in os.walk(path):
                    for file in files:
                        file_path = Path(root) / file
                        # Archive path should be relative to the parent of the folder being zipped
                        arcname = os.path.relpath(file_path, path.parent)
                        zip_file.write(file_path, arcname)
    
    zip_buffer.seek(0)
    return zip_buffer

def get_file_type(filename: str) -> str:
    """
    Returns a simplified file type category based on extension.
    """
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    types = {
        'image': ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'],
        'video': ['mp4', 'mkv', 'avi', 'mov', 'webm'],
        'audio': ['mp3', 'wav', 'ogg', 'flac', 'm4a'],
        'document': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
        'code': ['py', 'js', 'html', 'css', 'java', 'c', 'cpp', 'go', 'rs', 'php', 'sh', 'json', 'yml', 'yaml'],
        'archive': ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
    }
    
    for type_name, extensions in types.items():
        if ext in extensions:
            return type_name
    return 'file'

def load_users():
    """Loads users from the CSV file."""
    if not USERS_FILE.exists():
        return []
    with open(USERS_FILE, mode='r', newline='') as f:
        return list(csv.DictReader(f))

def save_user(username, password, folder):
    """Saves a new user to the CSV file."""
    file_exists = USERS_FILE.exists()
    with open(USERS_FILE, mode='a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['username', 'password', 'folder'])
        if not file_exists:
            writer.writeheader()
        writer.writerow({'username': username, 'password': password, 'folder': folder})