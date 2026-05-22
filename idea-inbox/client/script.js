const API = "http://localhost:3000/api/text";

const textfield = document.getElementById("text");

async function loadText() {
    const res = await fetch(API);
    const data = await res.json();
    textfield.value = data.text;
}

async function saveText() {
    const text = textfield.value;

    await fetch(API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
    });
}

textfield.addEventListener("change", () => {
    console.log(textfield.value);
    saveText();
});

loadText();