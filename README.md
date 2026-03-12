# Sentinel – AI Guardian 🛡️🚀🛡️

Sentinel is a multimodal AI safety companion built for the **Gemini Live Agent Challenge**. It analyzes your surroundings in real-time using your camera feed and text queries to provide proactive protection and guidance in high-risk situations.

## Live Demo 🔗

- **Frontend (Vercel)**: [https://sentinelaigaurdian.vercel.app/](https://sentinelaigaurdian.vercel.app/)
- **Backend (Google Cloud Run)**: [https://sentinel-api-818888700321.us-central1.run.app/health](https://sentinel-api-818888700321.us-central1.run.app/health)
- **Devpost**: [https://geminiliveagentchallenge.devpost.com/software/sentinel-ai-guardian](https://geminiliveagentchallenge.devpost.com/software/sentinel-ai-guardian)

---

## What It Does 🧠

When you feel unsafe, Sentinel sees your environment through your camera and:
- **Assesses Risk**: Analyzes lighting, isolation, and visual cues (e.g., people's behavior, blocked paths).
- **Proactive Guidance**: Speaks its analysis and specific recommendations aloud (e.g., "Move to a well-lit area").
- **Critical Escalation**: If the risk score is high (7+), it enters **CRITICAL mode**, automatically triggering:
  - Professional emergency siren synthesis.
  - SMS simulation to emergency contacts.
  - Live street-level navigation to the nearest safety checkpoint (e.g., City Police Station).
- **Safe Arrival**: Recognizes when you've reached a secure zone and provides confirmation.

## Key Features ✨

- **Multimodal AI**: Combined real-time camera feed + text query processing.
- **Official SDK**: Built using the official `@google/generative-ai` Node.js SDK.
- **Anti-Hallucination**: Specifically trained to detect "covered camera" scenarios as high-risk rather than assuming safety.
- **Immersive Audio**: Integrated browser Text-to-Speech (TTS) for hands-free safety advice.
- **Deterministic Routing**: Uses Google Maps Directions API for real-time walking navigation.
- **Resilient Architecture**: SDK-First approach with an automatic REST API fallback for 100% uptime.
- **Demo Genuineness**: Uses preset coordinates for Zirakpur/Chandigarh to ensure consistent and reliable judging.

---

## Tech Stack 🛠️

### Frontend
- **Framework**: React (Vite)
- **Maps**: Google Maps JavaScript API (Directions & Marker Services)
- **Audio**: Web Audio API (Siren Synthesis) & SpeechSynthesis (TTS)
- **Deployment**: Vercel

### Backend
- **Environment**: Node.js + Express
- **AI Engine**: Google GenAI SDK calling **Gemini 2.5 Flash**
- **Deployment**: Google Cloud Run (Containerized via Docker)
- **Monitoring**: Built-in `/health` and `/debug-api` endpoints

---

## Architecture 🏗️

```
Frontend (Vercel) 
       ↓ (Camera Frame + Text Query)
Backend (Google Cloud Run) 
       ↓ (Multimodal Prompt)
Gemini 2.5 Flash (via Official SDK) 
       ↓ (Risk Analysis + Recommendations)
Google Maps Directions Service
       ↓ (Walking Route Calculation)
Frontend Display + Spoken Output
```

---

## Gemini Live Agent Challenge Compliance 🏆

**Track**: Live Agents

**Why it fits**:
- **Beyond Chat**: It's a proactive guardian, not just a text-in/text-out bot.
- **Live Interaction**: Processes live camera frames and provides real-time spoken guidance.
- **Agentic Actions**: Autonomously triggers navigation, sirens, and alerts based on risk assessment.
- **Technical Excellence**:
  - Uses the official **Google GenAI SDK** ([geminiClient.js](backend/geminiClient.js)).
  - Deployed on **Google Cloud Run**.
  - Implements **Multimodal** inputs and **Spoken** outputs.

---

## Quick Start 🚀

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
2. Create a `.env` file with:
   ```env
   GEMINI_API_KEY=your_google_ai_key
   PORT=8080
   ```
3. Run locally:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the root directory:
   ```bash
   npm install
   npm run dev
   ```
2. Ensure your `.env` (or hardcoded keys in `App.jsx`) contains a valid **Google Maps API Key**.

---

## Deployment 🌐

### Google Cloud Run (Backend)
```bash
cd backend
gcloud run deploy sentinel-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GEMINI_API_KEY=your_key"
```

---

## API Documentation 📄

- **GET `/health`**: Returns system status and SDK version (`v2.0.0-SDK-STABLE`).
- **GET `/debug-api`**: Lists all Gemini models available to your API key.
- **POST `/analyze-safety`**: Core multimodal analysis endpoint.
- **POST `/get-safe-route`**: Returns navigation data for the safety checkpoint.

---

## Project Checkpoint 💾
- **Tag**: `sentinel-stable-v2-sdk`
- **Purpose**: Stable version with official SDK and enhanced speech logic.
