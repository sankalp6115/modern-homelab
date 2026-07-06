// const API = "http://localhost:8000/text";

export async function loadText() {
    const res = await fetch("/text");
    const data = await res.json();
    return data.text;
}

export async function saveText(text) {
    await fetch("/text", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
    });
}