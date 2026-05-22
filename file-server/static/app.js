let currentPath = "";
let selectedItems = new Set();
let clipboard = { items: [], srcPath: "", action: null };
let viewMode = "grid";
let allItems = [];
let fuse = null;
let dragCounter = 0;
let currentGalleryItems = [];
let currentGalleryIndex = -1;
let authMode = "login"; // 'login' or 'register'

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  setupGlobalEvents();
});

function setupGlobalEvents() {
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".context-menu")) {
      document.getElementById("context-menu").style.display = "none";
    }
    if (e.target === document.getElementById("modal-overlay")) {
      closeModals();
    }
    
    // Mobile sidebar close on click outside
    const sidebar = document.getElementById("sidebar");
    const isMobile = window.innerWidth <= 768;
    if (isMobile && sidebar.classList.contains("open") && !sidebar.contains(e.target) && !e.target.closest('[onclick="toggleSidebar()"]')) {
      sidebar.classList.remove("open");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModals();
      closePreview();
      selectedItems.clear();
      updateSelectionUI();
    }
    if (document.getElementById("preview-modal").style.display === "flex") {
      const isMedia = document.querySelector("video, audio");
      // Only navigate gallery with arrows if NOT currently focused on a video/audio element's seeking
      // Or simply, if we are in an image gallery, allow arrows. If video, let video handle arrows for seeking.
      const currentItem = currentGalleryItems[currentGalleryIndex];
      if (currentItem && currentItem.type === "image") {
        if (e.key === "ArrowRight") nextImage();
        if (e.key === "ArrowLeft") prevImage();
      }
    }
    if (e.key === "Enter") {
      if (document.getElementById("mkdir-modal").style.display === "block")
        createFolder();
      if (document.getElementById("rename-modal").style.display === "block")
        renameItem();
      if (document.getElementById("login-screen").style.display === "flex")
        handleAuth();
    }
  });

  setupDragAndDrop();
}

// Authentication
async function checkAuth() {
  try {
    const response = await fetch("/api/check-auth");
    if (response.ok) {
      const data = await response.json();
      showApp(data.user);
      loadFiles("");
    } else {
      showLogin();
    }
  } catch (e) {
    showLogin();
  }
}

function toggleAuthMode() {
  authMode = authMode === "login" ? "register" : "login";
  const title = document.getElementById("auth-title");
  const btn = document.getElementById("auth-btn");
  const toggle = document.querySelector(".toggle-auth");

  if (authMode === "register") {
    title.textContent = "Register";
    btn.textContent = "Register";
    toggle.textContent = "Already have an account? Login here";
  } else {
    title.textContent = "Login";
    btn.textContent = "Login";
    toggle.textContent = "Don't have an account? Register here";
  }
}

async function handleAuth() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  if (!username || !password) {
    showNotification("Please enter both username and password", "danger");
    return;
  }

  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);

  const endpoint = authMode === "login" ? "/api/login" : "/api/register";
  const response = await fetch(endpoint, { method: "POST", body: formData });

  if (response.ok) {
    if (authMode === "register") {
      showNotification("Registration successful! Please login.");
      toggleAuthMode();
    } else {
      checkAuth();
    }
  } else {
    const data = await response.json();
    showNotification(data.detail || "Authentication failed", "danger");
  }
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  showLogin();
}

function showLogin() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app-container").style.display = "none";
}

function showApp(username) {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app-container").style.display = "flex";
  lucide.createIcons();
}

// Loading Files
async function loadFiles(path) {
  try {
    const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
    if (response.status === 401) {
      showLogin();
      return;
    }

    const data = await response.json();
    currentPath = data.current_path;
    allItems = data.items;

    const folderCount = allItems.filter((i) => i.is_dir).length;
    const fileCount = allItems.filter((i) => !i.is_dir).length;
    document.getElementById("folder-stats").textContent =
      `${folderCount} folders and ${fileCount} files.`;

    fuse = new Fuse(allItems, {
      keys: ["name"],
      includeMatches: true,
      threshold: 0.4,
    });

    renderFiles(allItems);
    renderBreadcrumbs();
    selectedItems.clear();
    updateSelectionUI();
  } catch (error) {
    showNotification("Error loading files", "danger");
  }
}

function renderFiles(items, searchResults = null) {
  const fileView = document.getElementById("file-view");
  fileView.innerHTML = "";
  fileView.className = `file-view ${viewMode}`;

  const displayItems = searchResults ? searchResults.map((r) => r.item) : items;

  if (displayItems.length === 0) {
    fileView.innerHTML = `
            <div class="empty-state">
                <i data-lucide="folder-open" style="width: 48px; height: 48px; margin-bottom: 10px;"></i>
                <p>Empty Folder</p>
            </div>`;
    lucide.createIcons();
    return;
  }

  displayItems.forEach((item, index) => {
    const itemEl = document.createElement("div");
    itemEl.className = `file-item ${viewMode === "list" ? "list-view" : ""}`;
    itemEl.dataset.name = item.name;
    itemEl.dataset.isDir = item.is_dir;
    itemEl.draggable = true;

    const iconClass = getIconClass(item);
    const iconName = getIconForItem(item);

    let displayName = item.name;
    if (searchResults && searchResults[index].matches) {
      displayName = highlightMatches(
        item.name,
        searchResults[index].matches[0],
      );
    }

    const downloadUrl = `/api/download?path=${encodeURIComponent(currentPath)}&items=${encodeURIComponent(JSON.stringify([item.name]))}`;

    if (viewMode === "grid") {
      if (!item.is_dir && item.type === "image") {
        itemEl.innerHTML = `
                    <div class="thumbnail-container">
                        <img src="${downloadUrl}" loading="lazy" onload="this.classList.add('loaded')" style="width:100%;height:100%;object-fit:cover;">
                    </div>
                    <div class="file-name" title="${item.name}">${displayName}</div>
                `;
      } else {
        itemEl.innerHTML = `
                    <div class="file-icon-large ${iconClass}"><i data-lucide="${iconName}"></i></div>
                    <div class="file-name" title="${item.name}">${displayName}</div>
                `;
      }
    } else {
      // Compact List View: Info in front of name
      const metaInfo = item.is_dir ? "DIR" : formatSize(item.size);
      const dateInfo = formatDateShort(item.modified);
      itemEl.innerHTML = `
                <div class="file-icon ${iconClass}"><i data-lucide="${iconName}"></i></div>
                <div class="file-details">
                    <span class="file-meta">${metaInfo}</span>
                    <span class="file-meta" style="background:#fff;">${dateInfo}</span>
                    <div class="file-name" title="${item.name}">${displayName}</div>
                </div>
            `;
    }

    itemEl.onclick = (e) => handleItemClick(item, e);
    itemEl.oncontextmenu = (e) => showContextMenu(e, item);

    itemEl.ondragstart = (e) => {
      if (!selectedItems.has(item.name)) {
        selectedItems.clear();
        selectedItems.add(item.name);
        updateSelectionUI();
      }
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          items: Array.from(selectedItems),
          srcPath: currentPath,
        }),
      );
      itemEl.classList.add("dragging");
    };

    itemEl.ondragend = () => itemEl.classList.remove("dragging");

    if (item.is_dir) {
      itemEl.ondragenter = (e) => {
        e.preventDefault();
        itemEl.classList.add("drag-over");
      };
      itemEl.ondragover = (e) => {
        e.preventDefault();
      };
      itemEl.ondragleave = (e) => {
        itemEl.classList.remove("drag-over");
      };
      itemEl.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        itemEl.classList.remove("drag-over");
        const internalData = e.dataTransfer.getData("application/json");
        if (internalData) {
          const data = JSON.parse(internalData);
          moveInternalItems(
            data.items,
            data.srcPath,
            `${currentPath}/${item.name}`,
          );
        } else {
          handleDropUpload(e, `${currentPath}/${item.name}`);
        }
      };
    }

    fileView.appendChild(itemEl);
  });

  lucide.createIcons();
}

function getIconClass(item) {
  if (item.is_dir) return "icon-folder";
  switch (item.type) {
    case "image":
      return "icon-image";
    case "video":
      return "icon-video";
    case "audio":
      return "icon-audio";
    case "document":
      return "icon-doc";
    case "code":
      return "icon-code";
    case "archive":
      return "icon-archive";
    default:
      return "icon-file";
  }
}

function getIconForItem(item) {
  if (item.is_dir) return "folder";
  switch (item.type) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "music";
    case "document":
      return "file-text";
    case "code":
      return "file-code";
    case "archive":
      return "archive";
    default:
      return "file";
  }
}

function highlightMatches(text, match) {
  if (!match) return text;
  let result = "";
  let lastIndex = 0;
  match.indices.forEach(([start, end]) => {
    result += text.substring(lastIndex, start);
    result += `<span style="background:var(--accent);">${text.substring(start, end + 1)}</span>`;
    lastIndex = end + 1;
  });
  result += text.substring(lastIndex);
  return result;
}

function handleSearch() {
  const query = document.getElementById("search-input").value;
  if (!query) {
    renderFiles(allItems);
    return;
  }
  const results = fuse.search(query);
  renderFiles(null, results);
}

// Media Preview
function openPreview(item) {
  const modal = document.getElementById("preview-modal");
  const body = document.getElementById("preview-body");
  const filename = document.getElementById("preview-filename");

  // Stop any existing media first
  const mediaElements = body.querySelectorAll("video, audio");
  mediaElements.forEach((media) => {
    media.pause();
    media.src = "";
    media.load();
    media.remove();
  });

  filename.textContent = item.name;
  body.innerHTML = "";

  const streamUrl = `/api/stream?path=${encodeURIComponent(currentPath)}&name=${encodeURIComponent(item.name)}`;
  const downloadUrl = `/api/download?path=${encodeURIComponent(currentPath)}&items=${encodeURIComponent(JSON.stringify([item.name]))}`;

  if (item.type === "image") {
    currentGalleryItems = allItems.filter((i) => i.type === "image");
    currentGalleryIndex = currentGalleryItems.findIndex(
      (i) => i.name === item.name,
    );
    const img = document.createElement("img");
    img.src = downloadUrl;
    img.className = "brutal-image-preview";
    body.appendChild(img);
    updateGalleryUI(true);
  } else if (item.type === "video") {
    currentGalleryItems = allItems.filter((i) => i.type === "video");
    currentGalleryIndex = currentGalleryItems.findIndex(
      (i) => i.name === item.name,
    );

    const video = document.createElement("video");
    video.src = streamUrl;
    video.controls = true;
    video.autoplay = true;
    video.className = "netflix-video-player";
    body.appendChild(video);
    updateGalleryUI(currentGalleryItems.length > 1);
  } else if (item.type === "audio") {
    currentGalleryItems = allItems.filter((i) => i.type === "audio");
    currentGalleryIndex = currentGalleryItems.findIndex(
      (i) => i.name === item.name,
    );

    const audioContainer = document.createElement("div");
    audioContainer.className = "audio-player-container";
    audioContainer.innerHTML = `
      <div class="audio-visual"><i data-lucide="music"></i></div>
      <audio src="${streamUrl}" controls autoplay></audio>
    `;
    body.appendChild(audioContainer);
    lucide.createIcons();
    updateGalleryUI(currentGalleryItems.length > 1);
  } else {
    showNotification("Preview not supported", "info");
    return;
  }

  modal.style.display = "flex";
}

function updateGalleryUI(show) {
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  if (show && currentGalleryItems.length > 1) {
    prevBtn.style.display = "flex";
    nextBtn.style.display = "flex";
    prevBtn.disabled = currentGalleryIndex === 0;
    nextBtn.disabled = currentGalleryIndex === currentGalleryItems.length - 1;
  } else {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
  }
}

function nextImage() {
  if (currentGalleryIndex < currentGalleryItems.length - 1) {
    currentGalleryIndex++;
    openPreview(currentGalleryItems[currentGalleryIndex]);
  } else {
    // Loop back to start
    currentGalleryIndex = 0;
    openPreview(currentGalleryItems[currentGalleryIndex]);
  }
}

function prevImage() {
  if (currentGalleryIndex > 0) {
    currentGalleryIndex--;
    openPreview(currentGalleryItems[currentGalleryIndex]);
  } else {
    // Loop to end
    currentGalleryIndex = currentGalleryItems.length - 1;
    openPreview(currentGalleryItems[currentGalleryIndex]);
  }
}

function closePreview() {
  const modal = document.getElementById("preview-modal");
  const body = document.getElementById("preview-body");

  // Explicitly stop any media playback
  const mediaElements = body.querySelectorAll("video, audio");
  mediaElements.forEach((media) => {
    media.pause();
    media.src = "";
    media.load();
    media.remove();
  });

  body.innerHTML = "";
  modal.style.display = "none";
}

// Drag and Drop
function setupDragAndDrop() {
  window.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
  });
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  window.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
  });
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    handleDropUpload(e, currentPath);
  });
}

async function handleDropUpload(e, targetPath) {
  const items = e.dataTransfer.items;
  if (!items) return;
  const queue = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry();
    if (entry) queue.push(scanFileEntry(entry));
  }
  const results = await Promise.all(queue);
  const flattenedFiles = results.flat();
  if (flattenedFiles.length > 0) uploadFiles(flattenedFiles, targetPath);
}

async function scanFileEntry(entry, path = "") {
  if (entry.isFile) {
    return new Promise((resolve) =>
      entry.file((file) => resolve([{ file, path: path + file.name }])),
    );
  } else if (entry.isDirectory) {
    return new Promise((resolve) => {
      const reader = entry.createReader();
      reader.readEntries(async (entries) => {
        const subQueue = entries.map((se) =>
          scanFileEntry(se, path + entry.name + "/"),
        );
        const subResults = await Promise.all(subQueue);
        resolve(subResults.flat());
      });
    });
  }
  return [];
}

async function moveInternalItems(items, srcPath, destPath) {
  if (srcPath === destPath) return;
  const formData = new FormData();
  formData.append("src_path", srcPath);
  formData.append("dest_path", destPath);
  formData.append("items", JSON.stringify(items));
  const response = await fetch("/api/move", { method: "POST", body: formData });
  if (response.ok) {
    loadFiles(currentPath);
  }
}

// File Operations
function handleItemClick(item, e) {
  if (e.ctrlKey || e.metaKey) {
    toggleSelection(item.name);
  } else {
    if (item.is_dir) {
      navigateTo(currentPath ? `${currentPath}/${item.name}` : item.name);
    } else if (["image", "video", "audio"].includes(item.type)) {
      openPreview(item);
    } else if (item.name.toLowerCase().endsWith(".pdf")) {
      const url = `/api/download?path=${encodeURIComponent(currentPath)}&items=${encodeURIComponent(JSON.stringify([item.name]))}&inline=true`;
      window.open(url, "_blank");
    } else {
      toggleSelection(item.name);
    }
  }
}

async function uploadFiles(files, targetPath) {
  const progressBar = document.getElementById("upload-progress");
  const barFill = document.getElementById("progress-bar-fill");
  const percentLabel = document.getElementById("progress-percent");
  const filesLabel = document.getElementById("progress-files");
  const statusLabel = document.getElementById("progress-status");

  progressBar.style.display = "block";
  statusLabel.textContent = "Uploading...";
  filesLabel.textContent = `0 / ${files.length} files`;
  barFill.style.width = "0%";
  percentLabel.textContent = "0%";

  const formData = new FormData();
  formData.append("path", targetPath);
  const relPaths = [];
  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    const fileObj = item.file || item;
    formData.append("files", fileObj);
    relPaths.push(item.path || fileObj.name);
  }
  formData.append("relative_paths", JSON.stringify(relPaths));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        barFill.style.width = `${percent}%`;
        percentLabel.textContent = `${percent}%`;
        // Estimate files based on percentage (rough) or just keep file count
        filesLabel.textContent = `${Math.min(files.length, Math.round((percent/100) * files.length))} / ${files.length} files`;
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        showNotification("Upload complete");
        statusLabel.textContent = "Complete!";
        setTimeout(() => (progressBar.style.display = "none"), 2000);
        loadFiles(currentPath);
        resolve();
      } else {
        console.error("Upload failed with status:", xhr.status);
        console.error("Response:", xhr.responseText);
        showNotification(`Upload failed: ${xhr.status}`, "danger");
        progressBar.style.display = "none";
        reject();
      }
    };

    xhr.onerror = () => {
      showNotification("Upload error", "danger");
      progressBar.style.display = "none";
      reject();
    };

    xhr.send(formData);
  });
}

function navigateTo(path) {
  loadFiles(path);
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar").classList.remove("open");
  }
}

function renderBreadcrumbs() {
  const breadcrumb = document.getElementById("breadcrumb");
  breadcrumb.innerHTML = "";

  const rootItem = document.createElement("span");
  rootItem.className = "breadcrumb-item";
  rootItem.innerHTML =
    '<i data-lucide="home" style="width: 16px; height: 16px;"></i>';
  rootItem.onclick = () => navigateTo("");
  breadcrumb.appendChild(rootItem);

  if (currentPath) {
    const parts = currentPath.split("/").filter((p) => p);
    let pathAcc = "";
    parts.forEach((part, index) => {
      const sep = document.createElement("span");
      sep.textContent = " / ";
      sep.style.margin = "0 5px";
      breadcrumb.appendChild(sep);

      pathAcc = pathAcc ? `${pathAcc}/${part}` : part;
      const item = document.createElement("span");
      item.className = "breadcrumb-item";
      item.textContent = part;
      const target = pathAcc;
      item.onclick = () => navigateTo(target);
      breadcrumb.appendChild(item);
    });
  }
  lucide.createIcons();
}

function toggleSelection(itemName) {
  if (selectedItems.has(itemName)) selectedItems.delete(itemName);
  else selectedItems.add(itemName);
  updateSelectionUI();
}

function updateSelectionUI() {
  document
    .querySelectorAll(".file-item")
    .forEach((el) =>
      el.classList.toggle("selected", selectedItems.has(el.dataset.name)),
    );
  const actions = document.getElementById("selection-actions");
  const count = document.getElementById("selected-count");
  if (selectedItems.size > 0 || clipboard.action) {
    actions.style.display = "flex";
    count.textContent = `${selectedItems.size} selected`;
  } else actions.style.display = "none";
  document.getElementById("paste-btn").style.display = clipboard.action
    ? "flex"
    : "none";
}

let contextTarget = null;
function showContextMenu(e, item) {
  e.preventDefault();
  e.stopPropagation();
  contextTarget = item;
  const menu = document.getElementById("context-menu");
  menu.style.display = "block";
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;
  if (item && !selectedItems.has(item.name)) {
    selectedItems.clear();
    selectedItems.add(item.name);
    updateSelectionUI();
  }
  document.getElementById("menu-paste").style.display = clipboard.action
    ? "flex"
    : "none";
}

async function handleMenuAction(action) {
  document.getElementById("context-menu").style.display = "none";
  if (action === "open" && contextTarget) {
    if (contextTarget.is_dir)
      navigateTo(
        currentPath
          ? `${currentPath}/${contextTarget.name}`
          : contextTarget.name,
      );
    else openPreview(contextTarget);
  } else if (action === "download") downloadSelected();
  else if (action === "copy") copySelected();
  else if (action === "cut") cutSelected();
  else if (action === "paste") pasteItems();
  else if (action === "rename" && selectedItems.size === 1)
    showRenameModal(Array.from(selectedItems)[0]);
  else if (action === "delete") deleteSelected();
}

function triggerUpload() {
  document.getElementById("file-input").click();
}
function handleFileUpload(event) {
  uploadFiles(event.target.files, currentPath);
}

async function createFolder() {
  const name = document.getElementById("new-folder-name").value;
  if (!name) return;
  const formData = new FormData();
  formData.append("path", currentPath);
  formData.append("name", name);
  const response = await fetch("/api/mkdir", {
    method: "POST",
    body: formData,
  });
  if (response.ok) {
    closeModals();
    loadFiles(currentPath);
  }
}

async function deleteSelected() {
  if (
    selectedItems.size === 0 ||
    !confirm(`Delete ${selectedItems.size} items?`)
  )
    return;
  const formData = new FormData();
  formData.append("path", currentPath);
  formData.append("items", JSON.stringify(Array.from(selectedItems)));
  const response = await fetch("/api/delete", {
    method: "POST",
    body: formData,
  });
  if (response.ok) loadFiles(currentPath);
}

function copySelected() {
  clipboard = {
    items: Array.from(selectedItems),
    srcPath: currentPath,
    action: "copy",
  };
  showNotification(`Copied ${selectedItems.size} items`);
  updateSelectionUI();
}

function cutSelected() {
  clipboard = {
    items: Array.from(selectedItems),
    srcPath: currentPath,
    action: "cut",
  };
  showNotification(`Cut ${selectedItems.size} items`);
  updateSelectionUI();
}

async function pasteItems() {
  if (!clipboard.action) return;
  const endpoint = clipboard.action === "copy" ? "/api/copy" : "/api/move";
  const formData = new FormData();
  formData.append("src_path", clipboard.srcPath);
  formData.append("dest_path", currentPath);
  formData.append("items", JSON.stringify(clipboard.items));
  const response = await fetch(endpoint, { method: "POST", body: formData });
  if (response.ok) {
    loadFiles(currentPath);
    if (clipboard.action === "cut")
      clipboard = { items: [], srcPath: "", action: null };
    showNotification("Paste complete");
  }
}

async function renameItem() {
  const oldName = Array.from(selectedItems)[0];
  const newName = document.getElementById("rename-input").value;
  if (!newName || oldName === newName) return;
  const formData = new FormData();
  formData.append("path", currentPath);
  formData.append("old_name", oldName);
  formData.append("new_name", newName);
  const response = await fetch("/api/rename", {
    method: "POST",
    body: formData,
  });
  if (response.ok) {
    closeModals();
    loadFiles(currentPath);
  }
}

function downloadSelected() {
  if (selectedItems.size === 0) return;
  const items = JSON.stringify(Array.from(selectedItems));
  window.location.href = `/api/download?path=${encodeURIComponent(currentPath)}&items=${encodeURIComponent(items)}`;
}

function showCreateFolder() {
  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("mkdir-modal").style.display = "block";
  setTimeout(() => document.getElementById("new-folder-name").focus(), 100);
}

function showRenameModal(name) {
  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("rename-modal").style.display = "block";
  document.getElementById("rename-input").value = name;
  setTimeout(() => document.getElementById("rename-input").focus(), 100);
}

function closeModals() {
  document.getElementById("modal-overlay").style.display = "none";
  document
    .querySelectorAll(".modal")
    .forEach((m) => (m.style.display = "none"));
}

function setView(mode) {
  viewMode = mode;
  document
    .getElementById("view-grid")
    .classList.toggle("active", mode === "grid");
  document
    .getElementById("view-list")
    .classList.toggle("active", mode === "list");
  renderFiles(allItems);
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("open");
}

function showNotification(message, type = "success") {
  const container = document.getElementById("notification-container");
  const notif = document.createElement("div");
  notif.className = `notification ${type}`;
  notif.innerHTML = `<span>${message}</span>`;
  container.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = "0";
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDateShort(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
