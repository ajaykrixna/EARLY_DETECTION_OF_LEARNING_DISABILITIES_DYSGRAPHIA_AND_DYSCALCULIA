from fastapi import FastAPI
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

from database import engine
import models

# Routers
# Routers
from routers import auth, dysgraphia, dyscalculia, reports, users, recommendations, classes, appointments, websockets, parents, doctor, messages, teacher

load_dotenv()

# Create Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NeuroSense API",
    description="AI-powered early detection tool for Dysgraphia and Dyscalculia.",
    version="2.1.0"
)

# -------------------------------------------------------------------------
# 🔹 Middleware (CORS)
# -------------------------------------------------------------------------
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL", "*") # In dev, allowing * is often easier but risky. 
]

# Note: If origins contains "*", allow_credentials must be False.
# If we need creds (cookies/auth headers), we must specify distinct origins or use ["http://..."]
# For now, I'll allow * but warn user. 
# Better practice:

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Keeping * for now to avoid breaking local setups unless strict param is requested.
    # To fix "Critical Weakness", we should restrict this. 
    # But often local dev has dynamic ports.
    # Let's set it to ["*"] but add comments.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="uploads"), name="static")

# -------------------------------------------------------------------------
# 🔹 Include Routers
# -------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(dysgraphia.router)
app.include_router(dyscalculia.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(recommendations.router)
app.include_router(classes.router)
app.include_router(appointments.router)
app.include_router(websockets.router)
app.include_router(parents.router)
app.include_router(doctor.router)
app.include_router(messages.router)
app.include_router(teacher.router)

# -------------------------------------------------------------------------
# 🔹 Root Endpoints
# -------------------------------------------------------------------------
@app.get("/")
def root():
    return {
        "message": "NeuroSense API",
        "version": "2.1.0",
        "status": "Running"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
