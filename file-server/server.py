import os
import shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, Response, Cookie
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import utils

import uvicorn
import hashlib
import json

app = FastAPI(title="NASterpiece")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependency
async def verify_auth(nas_user: Optional[str] = Cookie(None), nas_session: Optional[str] = Cookie(None)):
    if not nas_user or not nas_session:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    users = utils.load_users()
    user = next((u for u in users if u['username'] == nas_user), None)
    if not user or user['password'] != nas_session:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    return nas_user

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/favicon.ico")

@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    with open("static/index.html", "r") as f:
        return f.read()

@app.post("/api/register")
async def register(username: str = Form(...), password: str = Form(...)):
    users = utils.load_users()
    if any(u['username'] == username for u in users):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hash_obj = hashlib.sha256(password.encode())
    hashed_password = hash_obj.hexdigest()
    
    # User's folder will be their username
    utils.save_user(username, hashed_password, username)
    
    # Pre-create the user's storage folder
    (utils.STORAGE_ROOT / username).mkdir(parents=True, exist_ok=True)
    
    return {"status": "success", "message": "User registered successfully"}

@app.post("/api/login")
async def login(response: Response, username: str = Form(...), password: str = Form(...)):
    users = utils.load_users()
    user = next((u for u in users if u['username'] == username), None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    hash_obj = hashlib.sha256(password.encode())
    hashed_password = hash_obj.hexdigest()
    
    if user['password'] == hashed_password:
        response.set_cookie(key="nas_user", value=username, httponly=True, samesite="strict")
        response.set_cookie(key="nas_session", value=hashed_password, httponly=True, samesite="strict")
        return {"status": "success"}
    else:
        raise HTTPException(status_code=401, detail="Invalid username or password")

@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie("nas_user")
    response.delete_cookie("nas_session")
    return {"status": "success"}

@app.get("/api/check-auth")
async def check_auth(auth=Depends(verify_auth)):
    return {"status": "authenticated", "user": auth}

@app.get("/api/files")
async def list_files(path: str = "", auth=Depends(verify_auth)):
    try:
        target_path = utils.get_safe_path(path, auth)
        if not target_path.exists() or not target_path.is_dir():
            raise HTTPException(status_code=404, detail="Directory not found")
        
        items = []
        for item in target_path.iterdir():
            stats = item.stat()
            items.append({
                "name": item.name,
                "is_dir": item.is_dir(),
                "size": stats.st_size if item.is_file() else 0,
                "modified": stats.st_mtime,
                "type": utils.get_file_type(item.name) if item.is_file() else "folder"
            })
        
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        
        return {
            "current_path": path,
            "items": items
        }
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_files(
    path: str = Form(""), 
    files: List[UploadFile] = File(...), 
    relative_paths: Optional[str] = Form(None), 
    auth=Depends(verify_auth)
):
    print(f"Received upload request for {len(files)} files at path: {path}")
    try:
        # Validate base directory
        utils.get_safe_path(path, auth)
        
        paths = []
        if relative_paths:
            import json
            paths = json.loads(relative_paths)
        
        for i, file in enumerate(files):
            # Sanitize and fall back to a safe name
            original_name = file.filename or f"uploaded_file_{i}"
            rel_path = paths[i] if i < len(paths) else original_name
            
            # Ensure we don't have empty paths
            if not rel_path:
                rel_path = f"file_{i}"
                
            file_path = utils.get_safe_path(os.path.join(path, rel_path), auth)
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        
        return {"status": "success", "message": f"Uploaded {len(files)} files"}
    except ValueError as e:
        print(f"Upload error (ValueError): {e}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        print(f"Upload error (General): {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mkdir")
async def make_directory(path: str = Form(""), name: str = Form(...), auth=Depends(verify_auth)):
    try:
        target_path = utils.get_safe_path(os.path.join(path, name), auth)
        target_path.mkdir(parents=True, exist_ok=True)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/delete")
async def delete_items(path: str = Form(""), items: str = Form(...), auth=Depends(verify_auth)):
    try:
        import json
        item_names = json.loads(items)
            
        for item_name in item_names:
            target_path = utils.get_safe_path(os.path.join(path, item_name), auth)
            if target_path.exists():
                if target_path.is_dir():
                    shutil.rmtree(target_path)
                else:
                    target_path.unlink()
        
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/move")
async def move_items(src_path: str = Form(""), dest_path: str = Form(""), items: str = Form(...), auth=Depends(verify_auth)):
    try:
        import json
        item_names = json.loads(items)
            
        dest_dir = utils.get_safe_path(dest_path, auth)
        for item_name in item_names:
            src = utils.get_safe_path(os.path.join(src_path, item_name), auth)
            dst = dest_dir / item_name
            if src.exists():
                shutil.move(src, dst)
        
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/copy")
async def copy_items(src_path: str = Form(""), dest_path: str = Form(""), items: str = Form(...), auth=Depends(verify_auth)):
    try:
        import json
        item_names = json.loads(items)
            
        dest_dir = utils.get_safe_path(dest_path, auth)
        for item_name in item_names:
            src = utils.get_safe_path(os.path.join(src_path, item_name), auth)
            dst = dest_dir / item_name
            if src.exists():
                if src.is_dir():
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)
        
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download")
async def download_items(path: str = "", items: Optional[str] = None, inline: bool = False, auth=Depends(verify_auth)):
    try:
        if not items:
            raise HTTPException(status_code=400, detail="No items specified")
            
        import json
        item_names = json.loads(items)
        
        if not item_names:
            raise HTTPException(status_code=400, detail="No items specified")
            
        if len(item_names) == 1:
            target_path = utils.get_safe_path(os.path.join(path, item_names[0]), auth)
            if target_path.is_file():
                if inline:
                    return FileResponse(target_path, content_disposition_type="inline")
                return FileResponse(target_path, filename=target_path.name)
            else:
                zip_stream = utils.create_zip_stream([target_path])
                return StreamingResponse(
                    zip_stream,
                    media_type="application/zip",
                    headers={"Content-Disposition": f"attachment; filename={target_path.name}.zip"}
                )
        else:
            paths = [utils.get_safe_path(os.path.join(path, name), auth) for name in item_names]
            zip_stream = utils.create_zip_stream(paths)
            return StreamingResponse(
                zip_stream,
                media_type="application/zip",
                headers={"Content-Disposition": "attachment; filename=archive.zip"}
            )
            
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stream")
async def stream_file(request: Request, name: str, path: str = "", auth=Depends(verify_auth)):
    try:
        target_path = utils.get_safe_path(os.path.join(path, name), auth)
        if not target_path.exists() or not target_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
        
        file_size = target_path.stat().st_size
        range_header = request.headers.get("Range")
        
        import mimetypes
        mime_type, _ = mimetypes.guess_type(target_path)
        if not mime_type:
            mime_type = "application/octet-stream"

        if range_header:
            byte_range = range_header.replace("bytes=", "").split("-")
            start = int(byte_range[0])
            end = int(byte_range[1]) if byte_range[1] else file_size - 1
            
            if start >= file_size:
                raise HTTPException(status_code=416, detail="Requested Range Not Satisfiable")
            
            chunk_size = (end - start) + 1
            
            def file_iterator(f_path, offset, size):
                with open(f_path, "rb") as f:
                    f.seek(offset)
                    remaining = size
                    while remaining > 0:
                        chunk = f.read(min(remaining, 1024 * 64))
                        if not chunk:
                            break
                        yield chunk
                        remaining -= len(chunk)

            return StreamingResponse(
                file_iterator(target_path, start, chunk_size),
                status_code=206,
                media_type=mime_type,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(chunk_size),
                }
            )
        
        return FileResponse(target_path, media_type=mime_type, headers={"Accept-Ranges": "bytes"})
        
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rename")
async def rename_item(path: str = Form(""), old_name: str = Form(...), new_name: str = Form(...), auth=Depends(verify_auth)):
    try:
        src = utils.get_safe_path(os.path.join(path, old_name), auth)
        dst = utils.get_safe_path(os.path.join(path, new_name), auth)
        
        if not src.exists():
            raise HTTPException(status_code=404, detail="Item not found")
        if dst.exists():
            raise HTTPException(status_code=400, detail="Destination already exists")
            
        os.rename(src, dst)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        timeout_keep_alive=600,
    )
