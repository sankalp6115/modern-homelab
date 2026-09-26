import subprocess

def run_script(script: str) -> str:
    """Run an AppleScript snippet via osascript and return stdout."""
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    return result.stdout.strip()

def open_application(name: str):
    """Activate a macOS application by name."""
    run_script(f'tell application "{name}" to activate')

def key_code(code: int, *modifiers):
    """Send key code with optional modifier keys to System Events."""
    mod_str = " & ".join(f'"{m}"' for m in modifiers) if modifiers else ""
    using_clause = f" using {{{mod_str}}}" if mod_str else ""
    run_script(f'tell application "System Events" to key code {code}{using_clause}')
