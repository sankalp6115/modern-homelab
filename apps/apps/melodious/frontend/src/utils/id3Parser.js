/**
 * Custom lightweight binary ID3v2 metadata parser.
 * Reads ID3v2.2, ID3v2.3, and ID3v2.4 frame structures directly from an ArrayBuffer,
 * extracting Title, Artist, Album, Genre, Year, and Album Art (APIC/PIC).
 * Falls back to filename parsing if ID3 metadata is missing.
 */

export async function parseID3(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    // Read the first 10 bytes to check if it's ID3 and compute total size
    const headerBlob = file.slice(0, 10);
    
    reader.onload = function(e) {
      const buffer = e.target.result;
      if (!buffer || buffer.byteLength < 10) {
        resolve({
          ...parseFallback(file.name),
          album: "",
          genre: "",
          year: "",
          albumArt: null,
          hasMetadata: false,
          fileSize: file.size,
          fileType: file.type
        });
        return;
      }
      
      const bytes = new Uint8Array(buffer);
      const isID3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33; // "ID3"
      
      if (!isID3) {
        resolve({
          ...parseFallback(file.name),
          album: "",
          genre: "",
          year: "",
          albumArt: null,
          hasMetadata: false,
          fileSize: file.size,
          fileType: file.type
        });
        return;
      }
      
      const majorVersion = bytes[3];
      const flags = bytes[5];
      
      // ID3v2 size is a 4-byte synchsafe integer (7 bits per byte)
      const tagSize = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
      
      // Limit tag size read to maximum 35MB to prevent out-of-memory errors on corrupted sizes
      const readSize = Math.min(10 + tagSize, file.size, 35 * 1024 * 1024);
      
      const fullTagBlob = file.slice(0, readSize);
      const tagReader = new FileReader();
      
      tagReader.onload = function(evt) {
        const tagBuffer = evt.target.result;
        if (!tagBuffer) {
          resolve({
            ...parseFallback(file.name),
            album: "",
            genre: "",
            year: "",
            albumArt: null,
            hasMetadata: false,
            fileSize: file.size,
            fileType: file.type
          });
          return;
        }
        
        try {
          let tagBytes = new Uint8Array(tagBuffer);
          
          // Handle Unsynchronisation at tag level (ID3v2.2 and ID3v2.3)
          // ID3v2.4 specifies unsynchronisation at frame level, but let's check flags too.
          const isUnsynchronized = (flags & 0x80) !== 0;
          if (isUnsynchronized && majorVersion < 4) {
            tagBytes = deunsynchronizeTagBody(tagBytes);
          }
          
          const tags = parseFrames(tagBytes, majorVersion, flags);
          const fallback = parseFallback(file.name);
          
          // Determine if we parsed actual ID3 metadata
          const hasMetadata = !!(tags.title || tags.artist || tags.album);
          
          resolve({
            title: tags.title || fallback.title,
            artist: tags.artist || fallback.artist,
            album: tags.album || "",
            genre: tags.genre || "",
            year: tags.year || "",
            albumArt: tags.albumArt || null,
            albumArtBlob: tags.albumArtBlob || null,
            hasMetadata: hasMetadata,
            fileSize: file.size,
            fileType: file.type
          });
        } catch (err) {
          console.error("Error parsing ID3 frames for file:", file.name, err);
          resolve({
            ...parseFallback(file.name),
            album: "",
            genre: "",
            year: "",
            albumArt: null,
            hasMetadata: false,
            fileSize: file.size,
            fileType: file.type
          });
        }
      };
      
      tagReader.onerror = function() {
        resolve({
          ...parseFallback(file.name),
          album: "",
          genre: "",
          year: "",
          albumArt: null,
          hasMetadata: false,
          fileSize: file.size,
          fileType: file.type
        });
      };
      
      tagReader.readAsArrayBuffer(fullTagBlob);
    };
    
    reader.onerror = function() {
      resolve({
        ...parseFallback(file.name),
        album: "",
        genre: "",
        year: "",
        albumArt: null,
        hasMetadata: false,
        fileSize: file.size,
        fileType: file.type
      });
    };
    
    reader.readAsArrayBuffer(headerBlob);
  });
}

/**
 * De-unsynchronizes the tag body (starting at index 10) by replacing 0xFF 0x00 with 0xFF.
 */
function deunsynchronizeTagBody(bytes) {
  if (bytes.length <= 10) return bytes;
  const header = bytes.subarray(0, 10);
  const body = bytes.subarray(10);
  const len = body.length;
  
  // Fast check if we actually have 0xFF 0x00 to save memory/processing
  let hasUnsync = false;
  for (let i = 0; i < len - 1; i++) {
    if (body[i] === 0xFF && body[i + 1] === 0x00) {
      hasUnsync = true;
      break;
    }
  }
  if (!hasUnsync) return bytes;

  const result = new Uint8Array(len);
  let r = 0;
  for (let i = 0; i < len; i++) {
    result[r++] = body[i];
    if (body[i] === 0xFF && i + 1 < len && body[i + 1] === 0x00) {
      i++;
    }
  }
  
  const deunsynced = new Uint8Array(10 + r);
  deunsynced.set(header, 0);
  deunsynced.set(result.subarray(0, r), 10);
  return deunsynced;
}

/**
 * De-unsynchronizes frame content by replacing 0xFF 0x00 with 0xFF.
 */
function deunsynchronizeFrame(bytes) {
  const len = bytes.length;
  let hasUnsync = false;
  for (let i = 0; i < len - 1; i++) {
    if (bytes[i] === 0xFF && bytes[i + 1] === 0x00) {
      hasUnsync = true;
      break;
    }
  }
  if (!hasUnsync) return bytes;
  
  const result = new Uint8Array(len);
  let r = 0;
  for (let i = 0; i < len; i++) {
    result[r++] = bytes[i];
    if (bytes[i] === 0xFF && i + 1 < len && bytes[i + 1] === 0x00) {
      i++;
    }
  }
  return result.subarray(0, r);
}

/**
 * Parses ID3 frames from the raw byte array of the tag block
 */
function parseFrames(bytes, majorVersion, tagFlags) {
  const tags = {};
  let offset = 10;
  const totalLength = bytes.byteLength;
  
  // Handle Extended Header
  // Bit 6 of tagFlags is extended header indicator
  const hasExtendedHeader = (tagFlags & 0x40) !== 0;
  if (hasExtendedHeader && offset + 4 <= totalLength) {
    if (majorVersion === 3) {
      const extSize = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
      // In v2.3, extSize excludes the 4-byte size indicator itself.
      // Total extended header size is 4 + extSize.
      if (offset + 4 + extSize <= totalLength && extSize >= 0) {
        offset += 4 + extSize;
      }
    } else if (majorVersion === 4) {
      // In v2.4, extSize is a 4-byte synchsafe integer and includes the 4-byte size descriptor.
      const extSize = (bytes[offset] << 21) | (bytes[offset + 1] << 14) | (bytes[offset + 2] << 7) | bytes[offset + 3];
      if (offset + extSize <= totalLength && extSize >= 4) {
        offset += extSize;
      }
    }
  }
  
  const isV2_2 = majorVersion === 2;
  const frameHeaderSize = isV2_2 ? 6 : 10;
  
  while (offset + frameHeaderSize < totalLength) {
    // Check for padding/null separator (0x00)
    if (bytes[offset] === 0) {
      break;
    }
    
    // Read frame ID
    let frameId = "";
    const idLength = isV2_2 ? 3 : 4;
    for (let i = 0; i < idLength; i++) {
      const charCode = bytes[offset + i];
      if (charCode < 32 || charCode > 126) {
        break;
      }
      frameId += String.fromCharCode(charCode);
    }
    
    if (frameId.length < idLength) {
      break;
    }
    
    // Read frame size
    let frameSize = 0;
    if (isV2_2) {
      // ID3v2.2 frame size is a 3-byte standard integer
      frameSize = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
    } else if (majorVersion === 3) {
      // ID3v2.3 frame size is a standard 32-bit integer
      const b1 = bytes[offset + 4];
      const b2 = bytes[offset + 5];
      const b3 = bytes[offset + 6];
      const b4 = bytes[offset + 7];
      frameSize = (b1 * 0x1000000) + (b2 << 16) + (b3 << 8) + b4;
    } else if (majorVersion === 4) {
      // ID3v2.4 frame size is a synchsafe integer (7 bits per byte)
      frameSize = (bytes[offset + 4] << 21) | (bytes[offset + 5] << 14) | (bytes[offset + 6] << 7) | bytes[offset + 7];
    } else {
      const b1 = bytes[offset + 4];
      const b2 = bytes[offset + 5];
      const b3 = bytes[offset + 6];
      const b4 = bytes[offset + 7];
      frameSize = (b1 * 0x1000000) + (b2 << 16) + (b3 << 8) + b4;
    }
    
    if (frameSize <= 0 || offset + frameHeaderSize + frameSize > totalLength) {
      break;
    }
    
    // Extract raw frame content
    let frameContent = bytes.subarray(offset + frameHeaderSize, offset + frameHeaderSize + frameSize);
    
    // Check frame-level unsynchronisation for ID3v2.4
    if (majorVersion === 4 && frameContent.length > 0) {
      const flags2 = bytes[offset + 9];
      const isFrameUnsynced = (flags2 & 0x02) !== 0;
      if (isFrameUnsynced) {
        frameContent = deunsynchronizeFrame(frameContent);
      }
    }
    
    // Map frameId and process
    if (frameId === "TIT2" || frameId === "TT2") {
      tags.title = decodeText(frameContent);
    } else if (frameId === "TPE1" || frameId === "TP1") {
      tags.artist = decodeText(frameContent);
    } else if (frameId === "TALB" || frameId === "TAL") {
      tags.album = decodeText(frameContent);
    } else if (frameId === "TCON" || frameId === "TCO") {
      tags.genre = decodeText(frameContent);
    } else if (frameId === "TYER" || frameId === "TYE" || frameId === "TDRC") {
      const yearText = decodeText(frameContent);
      tags.year = yearText ? yearText.substring(0, 4) : "";
    } else if (frameId === "APIC" || frameId === "PIC") {
      const pic = parseAPIC(frameContent, isV2_2);
      if (pic && pic.data) {
        try {
          const blob = new Blob([pic.data], { type: pic.mimeType });
          tags.albumArt = URL.createObjectURL(blob);
          tags.albumArtBlob = blob;
        } catch (e) {
          console.error("Error creating blob URL for picture frame:", e);
        }
      }
    }
    
    offset += frameHeaderSize + frameSize;
  }
  
  return tags;
}

/**
 * Decodes a text frame's byte content using the first byte as the encoding identifier.
 */
function decodeText(content) {
  if (content.length <= 1) return "";
  
  const encoding = content[0];
  const textBytes = content.subarray(1);
  let decoder;
  
  try {
    switch (encoding) {
      case 0: // ISO-8859-1 (Latin-1)
        decoder = new TextDecoder("windows-1252");
        break;
      case 1: // UTF-16 with BOM
        decoder = new TextDecoder("utf-16");
        break;
      case 2: // UTF-16BE without BOM
        decoder = new TextDecoder("utf-16be");
        break;
      case 3: // UTF-8
        decoder = new TextDecoder("utf-8");
        break;
      default:
        decoder = new TextDecoder("utf-8");
    }
    let text = decoder.decode(textBytes);
    // Strip trailing/leading null characters and trim whitespace
    return text.replace(/\0+$/, "").replace(/^\0+/, "").trim();
  } catch (err) {
    console.error("Error decoding text:", err);
    return "";
  }
}

/**
 * Parses APIC (Attached Picture) or PIC (ID3v2.2 Picture) frame content.
 * Integrates image header magic byte detection for resilience.
 */
function parseAPIC(content, isV2_2 = false) {
  if (content.length < 5) return null;
  
  // Try scanning for image magic bytes first (resilience strategy)
  let imageStart = -1;
  let mimeType = "image/jpeg";
  
  for (let i = 1; i < content.length - 4; i++) {
    // JPEG magic: FF D8 FF
    if (content[i] === 0xFF && content[i+1] === 0xD8 && content[i+2] === 0xFF) {
      imageStart = i;
      mimeType = "image/jpeg";
      break;
    }
    // PNG magic: 89 50 4E 47
    if (content[i] === 0x89 && content[i+1] === 0x50 && content[i+2] === 0x4E && content[i+3] === 0x47) {
      imageStart = i;
      mimeType = "image/png";
      break;
    }
    // GIF magic: 47 49 46 38 ("GIF8")
    if (content[i] === 0x47 && content[i+1] === 0x49 && content[i+2] === 0x46 && content[i+3] === 0x38) {
      imageStart = i;
      mimeType = "image/gif";
      break;
    }
    // WEBP / RIFF magic: 52 49 46 46 ("RIFF" ... "WEBP")
    if (content[i] === 0x52 && content[i+1] === 0x49 && content[i+2] === 0x46 && content[i+3] === 0x46) {
      imageStart = i;
      mimeType = "image/webp";
      break;
    }
  }
  
  if (imageStart !== -1) {
    return {
      mimeType,
      pictureType: 3, // Front cover
      data: content.subarray(imageStart)
    };
  }
  
  // Fallback to manual parsing if magic bytes are not found in the first bytes
  const encoding = content[0];
  let i = 1;
  
  if (isV2_2) {
    // ID3v2.2 Picture Frame:
    // [Encoding: 1 byte] [Image Format: 3 bytes e.g. "JPG", "PNG"] [Picture Type: 1 byte] [Description: null-term]
    if (content.length < 5) return null;
    const formatBytes = content.subarray(1, 4);
    const format = String.fromCharCode.apply(null, formatBytes).toUpperCase();
    if (format === "PNG") mimeType = "image/png";
    else if (format === "GIF") mimeType = "image/gif";
    else mimeType = "image/jpeg";
    
    const pictureType = content[4];
    i = 5;
    
    // Skip Description
    if (encoding === 1 || encoding === 2) {
      // UTF-16 description (2-byte null terminator)
      while (i < content.length - 1) {
        if (content[i] === 0 && content[i + 1] === 0) {
          i += 2;
          break;
        }
        i++;
      }
    } else {
      // 1-byte null terminator description
      while (i < content.length) {
        if (content[i] === 0) {
          i += 1;
          break;
        }
        i++;
      }
    }
    
    if (i >= content.length) return null;
    return {
      mimeType,
      pictureType,
      data: content.subarray(i)
    };
  } else {
    // Standard ID3v2.3 / ID3v2.4 APIC Frame:
    // [Encoding: 1 byte] [MIME type: null-terminated string] [Picture Type: 1 byte] [Description: null-term]
    let mimeBytes = [];
    while (i < content.length && content[i] !== 0) {
      mimeBytes.push(content[i]);
      i++;
    }
    mimeType = String.fromCharCode.apply(null, mimeBytes) || "image/jpeg";
    i++; // skip null terminator
    
    if (i >= content.length) return null;
    const pictureType = content[i];
    i++; // skip picture type
    
    // Skip Description
    if (encoding === 1 || encoding === 2) {
      while (i < content.length - 1) {
        if (content[i] === 0 && content[i + 1] === 0) {
          i += 2;
          break;
        }
        i++;
      }
    } else {
      while (i < content.length) {
        if (content[i] === 0) {
          i += 1;
          break;
        }
        i++;
      }
    }
    
    if (i >= content.length) return null;
    return {
      mimeType,
      pictureType,
      data: content.subarray(i)
    };
  }
}

/**
 * Parses artist and title from filename as a fallback.
 * Formats: "Artist - Title.mp3", "Artist-Title.mp3", or "Title.mp3"
 */
function parseFallback(filename) {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  let title = nameWithoutExt;
  let artist = "";
  
  if (nameWithoutExt.includes(" - ")) {
    const parts = nameWithoutExt.split(" - ");
    artist = parts[0].trim();
    title = parts.slice(1).join(" - ").trim();
  } else if (nameWithoutExt.includes("-")) {
    const parts = nameWithoutExt.split("-");
    artist = parts[0].trim();
    title = parts.slice(1).join("-").trim();
  }
  
  return {
    title: title || "Unknown Title",
    artist: artist || "Unknown Artist"
  };
}
