const fs = require("fs").promises;
const path = require("path");

const filePath = path.join(__dirname, "data.txt");

async function readFile() {
    try {
        return await fs.readFile(filePath, "utf-8");
    } catch {
        return "";
    }
}

async function writeFile(text) {
    await fs.writeFile(filePath, text, "utf-8");
}

module.exports = { readFile, writeFile };