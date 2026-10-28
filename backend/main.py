from fastapi import FastAPI
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, Field

app = FastAPI()

class TicketRequest(BaseModel):
    text: str = Field(min_length=1)

@app.get("/")
#serves the HTML page that calls /analyze.
def index():
    return FileResponse("static/index.html")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/greet/{name}", response_class=PlainTextResponse)
#returns a plain-text greeting using the name from the URL path.
def greet(name: str):
    return f"Hello, {name}!"
#any checks whether at least one keyword appears in the text.
#business logic
def classify_ticket(text: str) -> str:
    text = text.lower()

    if any(word in text for word in ["login", "log in", "password", "account"]):
        return "Account"

    if any(word in text for word in ["invoice", "payment", "refund"]):
        return "Billing"

    if any(word in text for word in ["error", "bug", "crash", "dashboard"]):
        return "Technical"

    return "Other"

@app.post("/analyze")
#handles the HTTP request and constructs the API response.
def analyze_ticket(ticket: TicketRequest):
    category = classify_ticket(ticket.text)

    return {
        "original": ticket.text,
        "character_count": len(ticket.text),
        "category": category,
    }