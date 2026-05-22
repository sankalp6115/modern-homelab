from fastapi import FastAPI, Request
import json ,random

app = FastAPI()

@app.on_event("startup")
def json_load():
    with open("quotes.json", "r") as file:
        app.state.quotes = json.load(file)

@app.get("/quote")
def get_quote(request : Request):
    quotes = request.app.state.quotes
    q=random.choice(quotes)
    return{
        "quote":q["quote"],
        "author":q["author"]
    }