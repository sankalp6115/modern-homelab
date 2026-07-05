import os
import json
import re
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any

import yt_dlp
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

logger = logging.getLogger("homelab.yt_downloader")

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
DOWNLOAD_FOLDER = BASE_DIR / 'downloads'
DOWNLOAD_FOLDER.mkdir(exist_ok=True)

# Templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

class DownloadQueueManager:
    def __init__(self, downloads_dir: Path, max_concurrent: int = 3):
        self.downloads_dir = downloads_dir
        self.max_concurrent = max_concurrent
        self.queue: asyncio.Queue = asyncio.Queue()
        self.downloads: Dict[str, Dict[str, Any]] = {}
        self.worker_tasks: List[asyncio.Task] = []
        self.cleanup_task: Optional[asyncio.Task] = None

    def start(self):
        # Start worker tasks
        for i in range(self.max_concurrent):
            task = asyncio.create_task(self._worker_loop(i))
            self.worker_tasks.append(task)
        # Start cleanup task
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info(f"DownloadQueueManager started with {self.max_concurrent} workers.")

    async def stop(self):
        for task in self.worker_tasks:
            task.cancel()
        if self.cleanup_task:
            self.cleanup_task.cancel()
        logger.info("DownloadQueueManager stopped.")

    async def _worker_loop(self, worker_id: int):
        while True:
            try:
                job_id = await self.queue.get()
                logger.info(f"Worker {worker_id} picked up job {job_id}")
                await self._process_job(job_id)
                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error processing job: {e}", exc_info=True)

    async def _cleanup_loop(self):
        while True:
            try:
                await asyncio.sleep(60)
                await self.run_cleanup()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}", exc_info=True)

    async def run_cleanup(self):
        now = datetime.utcnow()
        expiry_limit = timedelta(hours=1)
        
        # Clean up jobs in memory and corresponding files
        jobs_to_expire = []
        for job_id, job in list(self.downloads.items()):
            if job['status'] == 'completed' and job.get('completed_at'):
                completed_at = datetime.fromisoformat(job['completed_at'])
                if now - completed_at > expiry_limit:
                    jobs_to_expire.append(job_id)

        for job_id in jobs_to_expire:
            job = self.downloads[job_id]
            job['status'] = 'expired'
            if job.get('filename'):
                file_path = self.downloads_dir / job['filename']
                if file_path.exists():
                    try:
                        file_path.unlink()
                        logger.info(f"Deleted expired file: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to delete file {file_path}: {e}")

        # Scan folder for leftover files (safeguard)
        for path in self.downloads_dir.iterdir():
            if path.is_file() and path.name != '.gitkeep':
                try:
                    mtime = datetime.utcfromtimestamp(path.stat().st_mtime)
                    if now - mtime > expiry_limit:
                        path.unlink()
                        logger.info(f"Deleted orphaned file from disk: {path}")
                except Exception as e:
                    logger.error(f"Failed to check/delete orphaned file {path}: {e}")

    def enqueue_urls(self, urls: List[str], media_type: str, quality: str):
        asyncio.create_task(self._process_enqueue(urls, media_type, quality))

    async def _process_enqueue(self, urls: List[str], media_type: str, quality: str):
        for url in urls:
            url = url.strip()
            if not url:
                continue
            
            job_id = str(uuid.uuid4())
            self.downloads[job_id] = {
                'id': job_id,
                'url': url,
                'title': f"Resolving URL...",
                'status': 'resolving',
                'progress': '0%',
                'speed': '0B/s',
                'eta': '--:--',
                'filename': None,
                'media_type': media_type,
                'quality': quality,
                'created_at': datetime.utcnow().isoformat(),
                'completed_at': None
            }
            
            asyncio.create_task(self._resolve_and_queue(job_id, url, media_type, quality))

    async def _resolve_and_queue(self, job_id: str, url: str, media_type: str, quality: str):
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': 'in_playlist'
            }
            
            def extract():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    return ydl.extract_info(url, download=False)
                    
            info = await asyncio.to_thread(extract)
            
            if not info:
                raise Exception("No info extracted")

            if 'entries' in info:
                # Playlist
                self.downloads[job_id]['status'] = 'expanded'
                self.downloads[job_id]['title'] = f"Expanded: {info.get('title', 'Playlist')}"
                
                # Check for playlist entries
                entries = list(info['entries'])
                if not entries:
                    raise Exception("Empty playlist")
                    
                for entry in entries:
                    if not entry:
                        continue
                    entry_url = entry.get('url')
                    if not entry_url:
                        # Construct watch URL if it's just video ID
                        video_id = entry.get('id')
                        if video_id:
                            entry_url = f"https://www.youtube.com/watch?v={video_id}"
                        else:
                            continue
                            
                    entry_title = entry.get('title') or "Fetching title..."
                    child_job_id = str(uuid.uuid4())
                    self.downloads[child_job_id] = {
                        'id': child_job_id,
                        'url': entry_url,
                        'title': entry_title,
                        'status': 'queued',
                        'progress': '0%',
                        'speed': '0B/s',
                        'eta': '--:--',
                        'filename': None,
                        'media_type': media_type,
                        'quality': quality,
                        'created_at': datetime.utcnow().isoformat(),
                        'completed_at': None
                    }
                    await self.queue.put(child_job_id)
            else:
                # Single video
                self.downloads[job_id]['title'] = info.get('title', 'Unknown Video')
                self.downloads[job_id]['status'] = 'queued'
                await self.queue.put(job_id)
                
        except Exception as e:
            logger.error(f"Error resolving URL {url}: {e}")
            if job_id in self.downloads:
                self.downloads[job_id]['status'] = 'error'
                self.downloads[job_id]['error'] = f"Failed to resolve URL: {str(e)}"

    def _make_progress_hook(self, job_id: str):
        def my_hook(d):
            if job_id not in self.downloads:
                return
            if d['status'] == 'downloading':
                self.downloads[job_id]['status'] = 'downloading'
                self.downloads[job_id]['progress'] = d.get('_percent_str', '0%').strip()
                speed = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_speed_str', '0B/s'))
                eta = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_eta_str', '--:--'))
                self.downloads[job_id]['speed'] = speed.strip()
                self.downloads[job_id]['eta'] = eta.strip()
            elif d['status'] == 'finished':
                self.downloads[job_id]['progress'] = '100%'
        return my_hook

    def _make_pp_hook(self, job_id: str):
        def pp_hook(d):
            if job_id not in self.downloads:
                return
            if d['status'] == 'started':
                self.downloads[job_id]['status'] = 'converting'
                self.downloads[job_id]['progress'] = 'Converting...'
                self.downloads[job_id]['speed'] = 'Converting audio format...'
                self.downloads[job_id]['eta'] = ''
        return pp_hook

    async def _process_job(self, job_id: str):
        job = self.downloads.get(job_id)
        if not job:
            return
        if job['status'] == 'cancelled':
            return
            
        job['status'] = 'downloading'
        url = job['url']
        quality = job['quality']
        media_type = job['media_type']

        output_template = str(self.downloads_dir / f'%(title)s_{job_id}.%(ext)s')
        
        ydl_opts = {
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'progress_hooks': [self._make_progress_hook(job_id)],
            'postprocessor_hooks': [self._make_pp_hook(job_id)]
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
            def run():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)
                    return info, filename
            
            info, filename = await asyncio.to_thread(run)
            downloaded_file = Path(filename)
            if media_type == 'audio':
                downloaded_file = downloaded_file.with_suffix('.mp3')
                
            job['status'] = 'completed'
            job['filename'] = downloaded_file.name
            job['title'] = info.get('title', job['title'])
            job['completed_at'] = datetime.utcnow().isoformat()
            
        except Exception as e:
            logger.error(f"Error downloading {url} for job {job_id}: {e}")
            job['status'] = 'error'
            job['error'] = str(e)
            job['completed_at'] = datetime.utcnow().isoformat()

queue_manager = DownloadQueueManager(DOWNLOAD_FOLDER)

async def startup_event():
    queue_manager.start()

class VideoInfoRequest(BaseModel):
    url: str

class EnqueueRequest(BaseModel):
    url: str
    quality: str = "best"
    type: str = "video"

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.post("/api/info")
async def get_video_info(request_data: VideoInfoRequest):
    url = request_data.url
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'in_playlist'
    }
    
    def extract():
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(url, download=False)
            
    try:
        info = await asyncio.to_thread(extract)
        if not info:
            raise Exception("No information returned")
            
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

@router.post("/api/enqueue")
def enqueue(request_data: EnqueueRequest):
    url_input = request_data.url
    quality = request_data.quality
    media_type = request_data.type
    
    if not url_input:
        raise HTTPException(status_code=400, detail="URL is required")

    # Split lines to handle batch URLs
    urls = [line.strip() for line in url_input.split('\n') if line.strip()]
    if not urls:
         raise HTTPException(status_code=400, detail="No valid URLs found")
         
    queue_manager.enqueue_urls(urls, media_type, quality)
    return {'status': 'queued', 'message': f'Enqueued {len(urls)} inputs'}

@router.get("/api/queue")
def get_queue():
    return {'queue': list(queue_manager.downloads.values())}

@router.post("/api/cancel/{job_id}")
def cancel_job(job_id: str):
    job = queue_manager.downloads.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job['status'] == 'queued':
        job['status'] = 'cancelled'
        return {'status': 'cancelled'}
    else:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled (either running or finished)")

@router.post("/api/remove/{job_id}")
def remove_job(job_id: str):
    job = queue_manager.downloads.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Delete file if exists
    if job.get('filename'):
        file_path = queue_manager.downloads_dir / job['filename']
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                logger.error(f"Failed to delete file {file_path}: {e}")
                
    # Remove from dict
    queue_manager.downloads.pop(job_id, None)
    return {'status': 'removed'}

@router.post("/api/clear")
def clear_queue():
    # Clear completed, error, expired, or cancelled jobs from memory
    to_remove = []
    for job_id, job in queue_manager.downloads.items():
        if job['status'] in ('completed', 'error', 'expired', 'cancelled', 'expanded'):
            to_remove.append(job_id)
            
    for job_id in to_remove:
        queue_manager.downloads.pop(job_id, None)
        
    return {'status': 'cleared', 'count': len(to_remove)}

@router.get("/api/download/{job_id}")
def download_file(job_id: str):
    job = queue_manager.downloads.get(job_id)
    if not job or job['status'] != 'completed' or not job.get('filename'):
        raise HTTPException(status_code=404, detail="File not found or not completed")
        
    file_path = queue_manager.downloads_dir / job['filename']
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on server")
        
    return FileResponse(
        path=file_path,
        filename=job['filename'],
        media_type='video/mp4' if job['media_type'] == 'video' else 'audio/mpeg'
    )