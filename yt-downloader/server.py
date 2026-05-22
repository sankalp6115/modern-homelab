import os
import json
import re
import uuid
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any

import yt_dlp
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="YouTube Downloader API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_FOLDER = Path('./downloads')
DOWNLOAD_FOLDER.mkdir(exist_ok=True)

# Templates
templates = Jinja2Templates(directory="templates")

# In-memory storage for downloads
DOWNLOADS: Dict[str, Dict[str, Any]] = {}

class VideoInfoRequest(BaseModel):
    url: str

class EnqueueRequest(BaseModel):
    url: str
    quality: str = "best"
    type: str = "video"

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/info")
def get_video_info(request_data: VideoInfoRequest):
    url = request_data.url
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'in_playlist'
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if 'entries' in info:
                video_count = len(list(info['entries']))
                return {
                    'type': 'playlist',
                    'title': info.get('title', 'Unknown Playlist'),
                    'video_count': video_count
                }
            else:
                formats = []
                seen = set()
                
                for f in info.get('formats', []):
                    height = f.get('height')
                    ext = f.get('ext')
                    vcodec = f.get('vcodec', 'none')
                    
                    if height and vcodec != 'none':
                        quality = f"{height}p"
                        if quality not in seen:
                            formats.append({
                                'quality': quality,
                                'ext': ext
                            })
                            seen.add(quality)
                
                formats.sort(key=lambda x: int(x['quality'].replace('p', '')), reverse=True)
                
                return {
                    'type': 'video',
                    'title': info.get('title', 'Unknown Title'),
                    'duration': info.get('duration', 0),
                    'formats': formats[:8]
                }
                
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def process_download(job_id: str, url: str, quality: str, media_type: str):
    DOWNLOADS[job_id]['status'] = 'downloading'
    
    def my_hook(d):
        if d['status'] == 'downloading':
            DOWNLOADS[job_id]['progress'] = d.get('_percent_str', '0%').strip()
            # remove ANSI escape codes that yt-dlp might output
            speed = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_speed_str', '0B/s'))
            eta = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_eta_str', '--:--'))
            DOWNLOADS[job_id]['speed'] = speed.strip()
            DOWNLOADS[job_id]['eta'] = eta.strip()
        elif d['status'] == 'finished':
            DOWNLOADS[job_id]['progress'] = '100%'

    output_template = str(DOWNLOAD_FOLDER / f'%(title)s_{job_id}.%(ext)s')
    
    ydl_opts = {
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [my_hook]
    }
    
    if media_type == 'audio':
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        })
    elif media_type == 'video':
        if quality == 'best':
            ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        else:
            height = quality.replace('p', '')
            ydl_opts['format'] = f'bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/best[height<={height}][ext=mp4]/best'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            downloaded_file = Path(filename)
            if media_type == 'audio':
                downloaded_file = downloaded_file.with_suffix('.mp3')
                
            DOWNLOADS[job_id]['status'] = 'completed'
            DOWNLOADS[job_id]['filename'] = downloaded_file.name
            DOWNLOADS[job_id]['title'] = info.get('title', DOWNLOADS[job_id]['title'])
    except Exception as e:
        DOWNLOADS[job_id]['status'] = 'error'
        DOWNLOADS[job_id]['error'] = str(e)

@app.post("/api/enqueue")
def enqueue(request_data: EnqueueRequest, background_tasks: BackgroundTasks):
    url = request_data.url
    quality = request_data.quality
    media_type = request_data.type
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    def add_job(job_url, title=None):
        job_id = str(uuid.uuid4())
        DOWNLOADS[job_id] = {
            'id': job_id,
            'url': job_url,
            'title': title or 'Fetching info...',
            'status': 'queued',
            'progress': '0%',
            'speed': '0B/s',
            'eta': '--:--',
            'filename': None,
            'media_type': media_type,
            'quality': quality
        }
        background_tasks.add_task(process_download, job_id, job_url, quality, media_type)
        return job_id

    job_ids = []
    
    # Check if playlist
    ydl_opts = {'quiet': True, 'no_warnings': True, 'extract_flat': 'in_playlist'}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if 'entries' in info:
                for entry in info['entries']:
                    job_ids.append(add_job(entry['url'], entry.get('title')))
            else:
                job_ids.append(add_job(url, info.get('title')))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {'status': 'queued', 'job_ids': job_ids}

@app.get("/api/queue")
def get_queue():
    return {'queue': list(DOWNLOADS.values())}

@app.get("/api/download/{job_id}")
def download_file(job_id: str):
    job = DOWNLOADS.get(job_id)
    if not job or job['status'] != 'completed' or not job.get('filename'):
        raise HTTPException(status_code=404, detail="File not found or not completed")
        
    file_path = DOWNLOAD_FOLDER / job['filename']
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on server")
        
    return FileResponse(
        path=file_path,
        filename=job['filename'],
        media_type='video/mp4' if job['media_type'] == 'video' else 'audio/mpeg'
    )

if __name__ == '__main__':
    uvicorn.run("server:app", host='0.0.0.0', port=8001, reload=True)