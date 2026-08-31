import React, { useState, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import {
  Cloud,
  Folder,
  FolderOpen,
  LogOut,
  Plus,
  Search,
  LayoutGrid,
  List,
  FolderPlus,
  X,
  Download,
  Copy,
  Scissors,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Home,
  Music,
  Video as VideoIcon,
  Image as ImageIcon,
  FileText,
  FileCode,
  Archive,
  File as FileIcon,
  Clipboard,
  Menu
} from "lucide-react";
import "./styles/style.css";

const fetchWithAuth = async (endpoint, options = {}) => {
  const url = endpoint.startsWith("http") ? endpoint : `/${endpoint}`;
  const newOptions = {
    ...options,
    credentials: "include",
  };
  return fetch(url, newOptions);
};

const FileServer = () => {
  // App States
  const [currentPath, setCurrentPath] = useState("");
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [clipboard, setClipboard] = useState({ items: [], srcPath: "", action: null });
  const [viewMode, setViewMode] = useState("grid");
  const [allItems, setAllItems] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Auth States
  const [authStatus, setAuthStatus] = useState("checking"); // checking, authenticated, unauthenticated
  const [username, setUsername] = useState("");
  const [authMode, setAuthMode] = useState("login"); // login, register
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Modals / Overlays
  const [activeModal, setActiveModal] = useState(null); // null, mkdir, rename, preview
  const [newFolderName, setNewFolderName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [currentGalleryItems, setCurrentGalleryItems] = useState([]);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(-1);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState({
    show: false,
    status: "",
    percent: 0,
    filesLabel: "",
  });

  // Context Menu
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    item: null,
  });

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fuse search reference
  const fuseRef = useRef(null);

  // Refs for focusing
  const newFolderInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Trigger notification helper
  const showNotification = (message, type = "success") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  // Check auth status on mount
  const checkAuth = async () => {
    try {
      const response = await fetchWithAuth("api/check-auth");
      if (response.ok) {
        const data = await response.json();
        setUsername(data.user);
        setAuthStatus("authenticated");
        loadFiles("");
      } else {
        setAuthStatus("unauthenticated");
      }
    } catch (e) {
      setAuthStatus("unauthenticated");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Set up global click/keydown listeners
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".context-menu")) {
        setContextMenu((prev) => ({ ...prev, show: false }));
      }
    };

    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveModal(null);
        setSelectedItems(new Set());
      }
      if (activeModal === "preview" && previewItem && previewItem.type === "image") {
        if (e.key === "ArrowRight") nextImage();
        if (e.key === "ArrowLeft") prevImage();
      }
      if (e.key === "Enter") {
        if (activeModal === "mkdir") {
          createFolder();
        } else if (activeModal === "rename") {
          renameItem();
        } else if (authStatus === "unauthenticated") {
          handleAuth();
        }
      }
    };

    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [activeModal, previewItem, currentGalleryIndex, currentGalleryItems, authStatus, loginUsername, loginPassword, newFolderName, renameName, currentPath, selectedItems]);

  // Set up drag and drop on window
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
    };
    const handleDrop = (e) => {
      e.preventDefault();
      handleDropUpload(e, currentPath);
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [currentPath]);

  // Load files for a path
  const loadFiles = async (path) => {
    try {
      const response = await fetchWithAuth(`api/files?path=${encodeURIComponent(path)}`);
      if (response.status === 401) {
        setAuthStatus("unauthenticated");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load files");
      }

      const data = await response.json();
      setCurrentPath(data.current_path);
      setAllItems(data.items);
      setSearchResults(null);
      setSearchQuery("");
      setSelectedItems(new Set());

      fuseRef.current = new Fuse(data.items, {
        keys: ["name"],
        includeMatches: true,
        threshold: 0.4,
      });
    } catch (error) {
      showNotification("Error loading files", "danger");
    }
  };

  // Auth Submit handler
  const handleAuth = async (e) => {
    if (e) e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showNotification("Please enter both username and password", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("username", loginUsername);
    formData.append("password", loginPassword);

    const endpoint = authMode === "login" ? "api/login" : "api/register";
    try {
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        if (authMode === "register") {
          showNotification("Registration successful! Please login.");
          setAuthMode("login");
        } else {
          checkAuth();
        }
      } else {
        const data = await response.json();
        showNotification(data.detail || "Authentication failed", "danger");
      }
    } catch (err) {
      showNotification("Authentication request failed", "danger");
    }
  };

  const logout = async () => {
    try {
      await fetchWithAuth("api/logout", { method: "POST" });
      setAuthStatus("unauthenticated");
      setUsername("");
    } catch (e) {
      showNotification("Logout failed", "danger");
    }
  };

  // Search handler
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query) {
      setSearchResults(null);
      return;
    }
    if (fuseRef.current) {
      const results = fuseRef.current.search(query);
      setSearchResults(results);
    }
  };

  // Drag and Drop Upload recursively
  const handleDropUpload = async (e, targetPath) => {
    const items = e.dataTransfer.items;
    if (!items) return;
    const queue = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) queue.push(scanFileEntry(entry));
    }
    const results = await Promise.all(queue);
    const flattenedFiles = results.flat();
    if (flattenedFiles.length > 0) {
      uploadFiles(flattenedFiles, targetPath);
    }
  };

  const scanFileEntry = async (entry, path = "") => {
    if (entry.isFile) {
      return new Promise((resolve) =>
        entry.file((file) => resolve([{ file, path: path + file.name }]))
      );
    } else if (entry.isDirectory) {
      const reader = entry.createReader();

      const readAllEntries = () => {
        return new Promise((resolve, reject) => {
          let allEntries = [];
          const readBatch = () => {
            reader.readEntries(
              async (results) => {
                if (results.length === 0) {
                  resolve(allEntries);
                } else {
                  allEntries = allEntries.concat(results);
                  readBatch();
                }
              },
              (error) => reject(error)
            );
          };
          readBatch();
        });
      };

      try {
        const entries = await readAllEntries();
        const subQueue = entries.map((se) =>
          scanFileEntry(se, path + entry.name + "/")
        );
        const subResults = await Promise.all(subQueue);
        return subResults.flat();
      } catch (err) {
        console.error("Error reading directory:", err);
        return [];
      }
    }
    return [];
  };

  const uploadFiles = async (files, targetPath) => {
    setUploadProgress({
      show: true,
      status: "Uploading...",
      percent: 0,
      filesLabel: `0 / ${files.length} files`,
    });

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
      xhr.open("POST", `/api/upload`);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress((prev) => ({
            ...prev,
            percent,
            filesLabel: `${Math.min(
              files.length,
              Math.round((percent / 100) * files.length)
            )} / ${files.length} files`,
          }));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          showNotification("Upload complete");
          setUploadProgress((prev) => ({
            ...prev,
            status: "Complete!",
          }));
          setTimeout(
            () => setUploadProgress({ show: false, status: "", percent: 0, filesLabel: "" }),
            2000
          );
          loadFiles(currentPath);
          resolve();
        } else {
          showNotification(`Upload failed: ${xhr.status}`, "danger");
          setUploadProgress({ show: false, status: "", percent: 0, filesLabel: "" });
          reject();
        }
      };

      xhr.onerror = () => {
        showNotification("Upload error", "danger");
        setUploadProgress({ show: false, status: "", percent: 0, filesLabel: "" });
        reject();
      };

      xhr.send(formData);
    });
  };

  // Move items internally
  const moveInternalItems = async (items, srcPath, destPath) => {
    if (srcPath === destPath) return;
    const formData = new FormData();
    formData.append("src_path", srcPath);
    formData.append("dest_path", destPath);
    formData.append("items", JSON.stringify(items));

    try {
      const response = await fetchWithAuth("api/move", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        loadFiles(currentPath);
        showNotification("Moved items successfully");
      } else {
        showNotification("Failed to move items", "danger");
      }
    } catch (e) {
      showNotification("Error moving items", "danger");
    }
  };

  // Item Click Handler
  const handleItemClick = (item, e) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(item.name);
    } else {
      if (item.is_dir) {
        loadFiles(currentPath ? `${currentPath}/${item.name}` : item.name);
        setSidebarOpen(false);
      } else if (["image", "video", "audio"].includes(item.type)) {
        openPreview(item);
      } else if (item.name.toLowerCase().endsWith(".pdf")) {
        const url = `/api/download?path=${encodeURIComponent(
          currentPath
        )}&items=${encodeURIComponent(JSON.stringify([item.name]))}&inline=true`;
        window.open(url, "_blank");
      } else {
        toggleSelection(item.name);
      }
    }
  };

  const toggleSelection = (name) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Toolbar Actions
  const downloadSelected = () => {
    if (selectedItems.size === 0) return;
    const itemsStr = JSON.stringify(Array.from(selectedItems));
    window.location.href = `/api/download?path=${encodeURIComponent(
      currentPath
    )}&items=${encodeURIComponent(itemsStr)}`;
  };

  const copySelected = () => {
    setClipboard({
      items: Array.from(selectedItems),
      srcPath: currentPath,
      action: "copy",
    });
    showNotification(`Copied ${selectedItems.size} items`);
  };

  const cutSelected = () => {
    setClipboard({
      items: Array.from(selectedItems),
      srcPath: currentPath,
      action: "cut",
    });
    showNotification(`Cut ${selectedItems.size} items`);
  };

  const pasteItems = async () => {
    if (!clipboard.action) return;
    const endpoint = clipboard.action === "copy" ? "api/copy" : "api/move";
    const formData = new FormData();
    formData.append("src_path", clipboard.srcPath);
    formData.append("dest_path", currentPath);
    formData.append("items", JSON.stringify(clipboard.items));

    try {
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        loadFiles(currentPath);
        if (clipboard.action === "cut") {
          setClipboard({ items: [], srcPath: "", action: null });
        }
        showNotification("Paste complete");
      } else {
        showNotification("Paste failed", "danger");
      }
    } catch (e) {
      showNotification("Error pasting items", "danger");
    }
  };

  const deleteSelected = async () => {
    if (selectedItems.size === 0 || !window.confirm(`Delete ${selectedItems.size} items?`)) {
      return;
    }
    const formData = new FormData();
    formData.append("path", currentPath);
    formData.append("items", JSON.stringify(Array.from(selectedItems)));

    try {
      const response = await fetchWithAuth("api/delete", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        loadFiles(currentPath);
        showNotification("Deleted selected items");
      } else {
        showNotification("Delete failed", "danger");
      }
    } catch (e) {
      showNotification("Error deleting items", "danger");
    }
  };

  // Modals Creation / Renaming
  const showCreateFolderModal = () => {
    setNewFolderName("");
    setActiveModal("mkdir");
    setTimeout(() => newFolderInputRef.current?.focus(), 100);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const formData = new FormData();
    formData.append("path", currentPath);
    formData.append("name", newFolderName.trim());

    try {
      const response = await fetchWithAuth("api/mkdir", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setActiveModal(null);
        loadFiles(currentPath);
        showNotification("Created folder");
      } else {
        showNotification("Failed to create folder", "danger");
      }
    } catch (e) {
      showNotification("Error creating folder", "danger");
    }
  };

  const showRenameModal = (name) => {
    setRenameName(name);
    setActiveModal("rename");
    setTimeout(() => renameInputRef.current?.focus(), 100);
  };

  const renameItem = async () => {
    const oldName = Array.from(selectedItems)[0];
    if (!renameName.trim() || oldName === renameName.trim()) return;
    const formData = new FormData();
    formData.append("path", currentPath);
    formData.append("old_name", oldName);
    formData.append("new_name", renameName.trim());

    try {
      const response = await fetchWithAuth("api/rename", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setActiveModal(null);
        loadFiles(currentPath);
        showNotification("Renamed item");
      } else {
        showNotification("Rename failed", "danger");
      }
    } catch (e) {
      showNotification("Error renaming item", "danger");
    }
  };

  // File Upload Dialog
  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event) => {
    if (event.target.files) {
      uploadFiles(Array.from(event.target.files), currentPath);
    }
  };

  // Media Preview handlers
  const openPreview = (item) => {
    setPreviewItem(item);
    setActiveModal("preview");

    const galleryTypeItems = allItems.filter((i) => i.type === item.type);
    setCurrentGalleryItems(galleryTypeItems);
    const idx = galleryTypeItems.findIndex((i) => i.name === item.name);
    setCurrentGalleryIndex(idx);
  };

  const nextImage = () => {
    if (currentGalleryIndex < currentGalleryItems.length - 1) {
      const nextIdx = currentGalleryIndex + 1;
      setCurrentGalleryIndex(nextIdx);
      setPreviewItem(currentGalleryItems[nextIdx]);
    } else {
      setCurrentGalleryIndex(0);
      setPreviewItem(currentGalleryItems[0]);
    }
  };

  const prevImage = () => {
    if (currentGalleryIndex > 0) {
      const prevIdx = currentGalleryIndex - 1;
      setCurrentGalleryIndex(prevIdx);
      setPreviewItem(currentGalleryItems[prevIdx]);
    } else {
      const lastIdx = currentGalleryItems.length - 1;
      setCurrentGalleryIndex(lastIdx);
      setPreviewItem(currentGalleryItems[lastIdx]);
    }
  };

  // Context Menu
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();

    // If item is not in selection, make it the only selected item
    if (item && !selectedItems.has(item.name)) {
      setSelectedItems(new Set([item.name]));
    }

    setContextMenu({
      show: true,
      x: e.pageX,
      y: e.pageY,
      item,
    });
  };

  const handleMenuAction = (action) => {
    setContextMenu((prev) => ({ ...prev, show: false }));
    const target = contextMenu.item;

    if (action === "open" && target) {
      if (target.is_dir) {
        loadFiles(currentPath ? `${currentPath}/${target.name}` : target.name);
      } else {
        openPreview(target);
      }
    } else if (action === "download") {
      downloadSelected();
    } else if (action === "copy") {
      copySelected();
    } else if (action === "cut") {
      cutSelected();
    } else if (action === "paste") {
      pasteItems();
    } else if (action === "rename" && selectedItems.size === 1) {
      showRenameModal(Array.from(selectedItems)[0]);
    } else if (action === "delete") {
      deleteSelected();
    }
  };

  // Helpers
  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDateShort = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getIconClass = (item) => {
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
  };

  const renderIcon = (item) => {
    if (item.is_dir) return <Folder size={20} />;
    switch (item.type) {
      case "image":
        return <ImageIcon size={20} />;
      case "video":
        return <VideoIcon size={20} />;
      case "audio":
        return <Music size={20} />;
      case "document":
        return <FileText size={20} />;
      case "code":
        return <FileCode size={20} />;
      case "archive":
        return <Archive size={20} />;
      default:
        return <FileIcon size={20} />;
    }
  };

  // Highlights search matches in text
  const highlightMatches = (text, match) => {
    if (!match) return text;
    let result = [];
    let lastIndex = 0;
    match.indices.forEach(([start, end], i) => {
      result.push(text.substring(lastIndex, start));
      result.push(
        <span key={i} style={{ background: "var(--accent)" }}>
          {text.substring(start, end + 1)}
        </span>
      );
      lastIndex = end + 1;
    });
    result.push(text.substring(lastIndex));
    return result;
  };

  // Statistics calculation
  const folderCount = allItems.filter((i) => i.is_dir).length;
  const fileCount = allItems.filter((i) => !i.is_dir).length;

  if (authStatus === "checking") {
    return (
      <div className="file-server-app" style={{ justifyContent: "center", alignItems: "center" }}>
        <h2 style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800 }}>Loading NASterpiece...</h2>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="file-server-app">
        <div className="login-screen">
          <form className="login-box" onSubmit={handleAuth}>
            <div className="logo" style={{ marginBottom: 20, justifyContent: "center" }}>
              <Cloud size={24} />
              <span>NASterpiece</span>
            </div>
            <h2>{authMode === "login" ? "Login" : "Register"}</h2>
            <div className="input-group">
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              {authMode === "login" ? "Login" : "Register"}
            </button>
            <div
              className="toggle-auth"
              onClick={() => setAuthMode((m) => (m === "login" ? "register" : "login"))}
            >
              {authMode === "login"
                ? "Don't have an account? Register here"
                : "Already have an account? Login here"}
            </div>
          </form>
        </div>

        {/* Notifications */}
        <div className="notification-container">
          {notifications.map((n) => (
            <div key={n.id} className={`notification ${n.type}`}>
              <span>{n.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Display items matching search query
  const displayItems = searchResults ? searchResults : allItems.map((item) => ({ item }));

  return (
    <div className="file-server-app">
      <div className="app-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div className="logo">
              <Cloud size={24} />
              <span>NASterpiece</span>
            </div>
            <button className="btn-icon mobile-only" onClick={() => setSidebarOpen(false)} style={{ border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}>
              <X size={16} />
            </button>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-group-label">Explorer</div>
            <div className="nav-item active" onClick={() => loadFiles("")}>
              <Folder size={18} />
              <span>All Files</span>
            </div>
          </nav>
          <div className="sidebar-footer">
            <button className="btn-ghost" onClick={logout} style={{ border: "none", background: "#fff", fontWeight: 800, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, cursor: "pointer", width: "100%", padding: "8px 0" }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content" onDragOver={(e) => e.preventDefault()}>
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <h1>My Personal Cloud</h1>
              <p>{folderCount} folders and {fileCount} files.</p>
            </div>
            <div className="hero-actions">
              <button className="btn-icon mobile-only" onClick={() => setSidebarOpen(true)} style={{ marginRight: 10, border: "2px solid #000", boxShadow: "2px 2px 0 #000" }}>
                <Menu size={16} />
              </button>
              <div className="search-container">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              <button className="btn-primary" onClick={triggerUpload}>
                <Plus size={18} />
                <span>Upload</span>
              </button>
            </div>
          </section>

          <div className="explorer-container">
            <header className="explorer-header">
              {/* Breadcrumb */}
              <div className="breadcrumb">
                <span className="breadcrumb-item" onClick={() => loadFiles("")}>
                  <Home size={16} style={{ display: "inline-block", verticalAlign: "middle" }} />
                </span>
                {currentPath &&
                  currentPath.split("/").filter(Boolean).map((part, index, arr) => {
                    const partialPath = arr.slice(0, index + 1).join("/");
                    return (
                      <React.Fragment key={index}>
                        <span style={{ margin: "0 5px" }}> / </span>
                        <span className="breadcrumb-item" onClick={() => loadFiles(partialPath)}>
                          {part}
                        </span>
                      </React.Fragment>
                    );
                  })}
              </div>

              {/* View Controls */}
              <div className="view-controls">
                <button
                  className={`btn-icon ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  className={`btn-icon ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <List size={16} />
                </button>
                <button className="btn-icon" onClick={showCreateFolderModal} title="New Folder">
                  <FolderPlus size={16} />
                </button>
              </div>
            </header>

            {/* Selection Actions Toolbar */}
            {(selectedItems.size > 0 || clipboard.action) && (
              <div className="toolbar">
                <div className="selection-info">
                  <span style={{ fontWeight: 800 }}>{selectedItems.size} items selected</span>
                </div>
                <div className="selection-buttons">
                  {selectedItems.size > 0 && (
                    <>
                      <button className="btn-action" onClick={downloadSelected} title="Download">
                        <Download size={16} />
                      </button>
                      <button className="btn-action" onClick={copySelected} title="Copy">
                        <Copy size={16} />
                      </button>
                      <button className="btn-action" onClick={cutSelected} title="Cut">
                        <Scissors size={16} />
                      </button>
                      <button
                        className="btn-action"
                        onClick={deleteSelected}
                        style={{ background: "var(--danger)" }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {clipboard.action && (
                    <button className="btn-primary" onClick={pasteItems}>
                      Paste
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* File List / Grid View */}
            <div
              className={`file-view ${viewMode}`}
              onContextMenu={(e) => handleContextMenu(e, null)}
            >
              {displayItems.length === 0 ? (
                <div className="empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
                  <FolderOpen size={48} style={{ marginBottom: 10 }} />
                  <p>Empty Folder</p>
                </div>
              ) : (
                displayItems.map(({ item, matches }, index) => {
                  const isSel = selectedItems.has(item.name);
                  const iconClass = getIconClass(item);
                  const downloadUrl = `/api/download?path=${encodeURIComponent(
                    currentPath
                  )}&items=${encodeURIComponent(JSON.stringify([item.name]))}`;

                  let displayName = item.name;
                  if (matches && matches[0]) {
                    displayName = highlightMatches(item.name, matches[0]);
                  }

                  if (viewMode === "grid") {
                    return (
                      <div
                        key={item.name}
                        className={`file-item ${isSel ? "selected" : ""}`}
                        onClick={(e) => handleItemClick(item, e)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        draggable
                        onDragStart={(e) => {
                          const newSelection = new Set(selectedItems);
                          if (!newSelection.has(item.name)) {
                            newSelection.clear();
                            newSelection.add(item.name);
                            setSelectedItems(newSelection);
                          }
                          e.dataTransfer.setData(
                            "application/json",
                            JSON.stringify({
                              items: Array.from(newSelection),
                              srcPath: currentPath,
                            })
                          );
                        }}
                        onDragEnter={(e) => {
                          if (item.is_dir) {
                            e.preventDefault();
                            e.currentTarget.classList.add("drag-over");
                          }
                        }}
                        onDragOver={(e) => {
                          if (item.is_dir) {
                            e.preventDefault();
                          }
                        }}
                        onDragLeave={(e) => {
                          if (item.is_dir) {
                            e.currentTarget.classList.remove("drag-over");
                          }
                        }}
                        onDrop={(e) => {
                          if (!item.is_dir) return;
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove("drag-over");
                          const internalData = e.dataTransfer.getData("application/json");
                          if (internalData) {
                            const data = JSON.parse(internalData);
                            moveInternalItems(
                              data.items,
                              data.srcPath,
                              currentPath ? `${currentPath}/${item.name}` : item.name
                            );
                          } else {
                            handleDropUpload(e, currentPath ? `${currentPath}/${item.name}` : item.name);
                          }
                        }}
                      >
                        {!item.is_dir && item.type === "image" ? (
                          <div className="thumbnail-container">
                            <img
                              src={downloadUrl}
                              alt={item.name}
                              loading="lazy"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ) : (
                          <div className={`file-icon-large ${iconClass}`}>
                            {renderIcon(item)}
                          </div>
                        )}
                        <div className="file-name" title={item.name}>
                          {displayName}
                        </div>
                      </div>
                    );
                  } else {
                    // Compact List View
                    const metaInfo = item.is_dir ? "DIR" : formatSize(item.size);
                    const dateInfo = formatDateShort(item.modified);

                    return (
                      <div
                        key={item.name}
                        className={`file-item list-view ${isSel ? "selected" : ""}`}
                        onClick={(e) => handleItemClick(item, e)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        draggable
                        onDragStart={(e) => {
                          const newSelection = new Set(selectedItems);
                          if (!newSelection.has(item.name)) {
                            newSelection.clear();
                            newSelection.add(item.name);
                            setSelectedItems(newSelection);
                          }
                          e.dataTransfer.setData(
                            "application/json",
                            JSON.stringify({
                              items: Array.from(newSelection),
                              srcPath: currentPath,
                            })
                          );
                        }}
                        onDragEnter={(e) => {
                          if (item.is_dir) {
                            e.preventDefault();
                            e.currentTarget.classList.add("drag-over");
                          }
                        }}
                        onDragOver={(e) => {
                          if (item.is_dir) {
                            e.preventDefault();
                          }
                        }}
                        onDragLeave={(e) => {
                          if (item.is_dir) {
                            e.currentTarget.classList.remove("drag-over");
                          }
                        }}
                        onDrop={(e) => {
                          if (!item.is_dir) return;
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.classList.remove("drag-over");
                          const internalData = e.dataTransfer.getData("application/json");
                          if (internalData) {
                            const data = JSON.parse(internalData);
                            moveInternalItems(
                              data.items,
                              data.srcPath,
                              currentPath ? `${currentPath}/${item.name}` : item.name
                            );
                          } else {
                            handleDropUpload(e, currentPath ? `${currentPath}/${item.name}` : item.name);
                          }
                        }}
                      >
                        <div className={`file-icon ${iconClass}`}>{renderIcon(item)}</div>
                        <div className="file-details">
                          <span className="file-meta">{metaInfo}</span>
                          <span className="file-meta" style={{ background: "#fff" }}>
                            {dateInfo}
                          </span>
                          <div className="file-name" title={item.name}>
                            {displayName}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* Modals & Overlay */}
      {activeModal && activeModal !== "preview" && (
        <>
          <div className="modal-overlay" onClick={() => setActiveModal(null)}></div>

          {activeModal === "mkdir" && (
            <div className="modal">
              <div className="modal-header">
                <h3>New Folder</h3>
                <button className="btn-icon" onClick={() => setActiveModal(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="login-box input"
                  style={{ width: "100%", padding: 12, border: "2px solid #000" }}
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  ref={newFolderInputRef}
                />
              </div>
              <div className="modal-footer">
                <button className="btn-primary" style={{ background: "#fff" }} onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={createFolder}>
                  Create
                </button>
              </div>
            </div>
          )}

          {activeModal === "rename" && (
            <div className="modal">
              <div className="modal-header">
                <h3>Rename</h3>
                <button className="btn-icon" onClick={() => setActiveModal(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="login-box input"
                  style={{ width: "100%", padding: 12, border: "2px solid #000" }}
                  placeholder="New name..."
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  ref={renameInputRef}
                />
              </div>
              <div className="modal-footer">
                <button className="btn-primary" style={{ background: "#fff" }} onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={renameItem}>
                  Rename
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Media Preview Modal */}
      {activeModal === "preview" && previewItem && (
        <div className="preview-modal" style={{ display: "flex" }}>
          <div className="preview-header">
            <div className="preview-title">
              <span>{previewItem.name}</span>
            </div>
            <button className="btn-icon" onClick={() => setActiveModal(null)} style={{ background: "transparent", color: "#fff", border: "none" }}>
              <X size={24} />
            </button>
          </div>
          <div className="preview-body-container">
            {currentGalleryItems.length > 1 && (
              <button className="nav-btn prev" onClick={prevImage}>
                <ChevronLeft size={24} />
              </button>
            )}

            <div className="preview-body">
              {previewItem.type === "image" && (
                <img
                  src={`/api/download?path=${encodeURIComponent(
                    currentPath
                  )}&items=${encodeURIComponent(JSON.stringify([previewItem.name]))}`}
                  className="brutal-image-preview"
                  alt={previewItem.name}
                />
              )}

              {previewItem.type === "video" && (
                <video
                  src={`/api/stream?path=${encodeURIComponent(
                    currentPath
                  )}&name=${encodeURIComponent(previewItem.name)}`}
                  controls
                  autoPlay
                  className="netflix-video-player"
                />
              )}

              {previewItem.type === "audio" && (
                <div className="audio-player-container">
                  <div className="audio-visual">
                    <Music size={100} color="#000" />
                  </div>
                  <audio
                    src={`/api/stream?path=${encodeURIComponent(
                      currentPath
                    )}&name=${encodeURIComponent(previewItem.name)}`}
                    controls
                    autoPlay
                  />
                </div>
              )}
            </div>

            {currentGalleryItems.length > 1 && (
              <button className="nav-btn next" onClick={nextImage}>
                <ChevronRight size={24} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.item && (
            <div className="menu-item" onClick={() => handleMenuAction("open")}>
              <ExternalLink size={16} /> Open
            </div>
          )}
          {selectedItems.size > 0 && (
            <>
              <div className="menu-item" onClick={() => handleMenuAction("download")}>
                <Download size={16} /> Download
              </div>
              <div className="menu-item" onClick={() => handleMenuAction("copy")}>
                <Copy size={16} /> Copy
              </div>
              <div className="menu-item" onClick={() => handleMenuAction("cut")}>
                <Scissors size={16} /> Cut
              </div>
            </>
          )}
          {clipboard.action && (
            <div className="menu-item" onClick={() => handleMenuAction("paste")}>
              <Clipboard size={16} /> Paste
            </div>
          )}
          {selectedItems.size === 1 && (
            <div className="menu-item" onClick={() => handleMenuAction("rename")}>
              <Edit3 size={16} /> Rename
            </div>
          )}
          {selectedItems.size > 0 && (
            <div className="menu-item danger" onClick={() => handleMenuAction("delete")}>
              <Trash2 size={16} /> Delete
            </div>
          )}
        </div>
      )}

      {/* Upload Progress UI */}
      {uploadProgress.show && (
        <div className="upload-progress">
          <div className="progress-header">
            <span>{uploadProgress.status}</span>
            <span>{uploadProgress.percent}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${uploadProgress.percent}%` }}
            ></div>
          </div>
          <div className="progress-info">{uploadProgress.filesLabel}</div>
        </div>
      )}

      {/* Notifications */}
      <div className="notification-container">
        {notifications.map((n) => (
          <div key={n.id} className={`notification ${n.type}`}>
            <span>{n.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileServer;
