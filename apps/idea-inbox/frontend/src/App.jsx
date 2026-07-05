import React, { useState, useEffect } from "react";
import { loadText, saveText } from "./api/api";
import "./styles/style.css"

const Textbox = () => {
  const [text, setText] = useState("");

  useEffect(() => {
    loadText().then((data) => setText(data));
  }, []);

  const save = () => {
    saveText(text);
  }

  return (
    <div className="idea-inbox-app">
      <div className="textsync">
        <h2>Text Sync</h2>
        <textarea id="text" rows="10" cols="50" value={text} onChange={(e) => setText(e.target.value)}></textarea>
        <button type="button" onClick={save}>Save</button>
      </div>
    </div>
  )
}

export default Textbox