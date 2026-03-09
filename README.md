# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Backend Deploy to Cloud Run

This project is optimized for the **Gemini Live Agent Challenge** and can be deployed to Google Cloud Run.

### ⚠️ Prerequisite
You MUST navigate to the `backend/` directory in your terminal before running any command below:
```bash
cd backend
```

### Exact Deploy Command

**For Bash (macOS/Linux/Git Bash):**
```bash
gcloud run deploy sentinel-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_API_KEY" \
  --set-env-vars "GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY" \
  --set-env-vars "PROJECT_ID=sentinel-ai-488011" \
  --set-env-vars "LOCATION=us-central1"
```

**For PowerShell (Windows):**
```powershell
gcloud run deploy sentinel-api `
  --source . `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --port 8080 `
  --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_API_KEY" `
  --set-env-vars "GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY" `
  --set-env-vars "PROJECT_ID=sentinel-ai-488011" `
  --set-env-vars "LOCATION=us-central1"
```

### Environment Variables List
- `GEMINI_API_KEY`: Get from [aistudio.google.com](https://aistudio.google.com/)
- `GOOGLE_MAPS_API_KEY`: Your Google Maps Platform key
- `PROJECT_ID`: `sentinel-ai-488011`
- `LOCATION`: `us-central1`

### Test Locally
```bash
# Build the image
docker build -t sentinel-api .

# Run locally
docker run -p 8080:8080 -e GEMINI_API_KEY=YOUR_KEY sentinel-api
```

### Test Health Endpoint
```bash
curl http://localhost:8080/health
```
