const express = require("express");
const cors = require("cors");
const { readFile, writeFile } = require("./fileService");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/text", async (req, res) => {
  try {
    const data = await readFile();
    res.json({ text: data });
  } catch (err) {
    console.error("READ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/text", async (req, res) => {
  try {
    const { text } = req.body;
    await writeFile(text);
    res.json({ message: "Saved successfully" });
  } catch (err) {
    console.error("WRITE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});