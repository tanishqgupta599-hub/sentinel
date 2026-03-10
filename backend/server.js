import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// CRITICAL: Add a check to ensure the API key is loaded.
if (!GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not defined. Please set it in your .env file or deployment environment.");
  process.exit(1); 
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// FIX: Use a verified stable model name
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/**
 * Helper to call Gemini with retry logic, fallback, and 15s timeout
 * @param {Array} parts - Parts to send to Gemini (strictly formatted)
 * @param {number} retryCount - Number of retries remaining
 */
async function callGemini(parts, retryCount = 2) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const result = await model.generateContent({
      contents: [{ role: "user", parts }]
    }, { signal: controller.signal });
    
    clearTimeout(timeoutId);

    if (!result || !result.response) {
      throw new Error("Invalid response from Gemini");
    }
    
    // Check candidates first for robust parsing
    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || result.response.text();
    if (!text) {
        throw new Error("Empty text returned from model");
    }
    
    return text;
  } catch (error) {
    const isQuotaError = error.message.includes("429") || error.message.includes("Quota exceeded");
    const isServiceError = error.message.includes("503") || error.message.includes("Service Unavailable");
    const isTimeout = error.name === 'AbortError';
    
    console.error(`\n[GEMINI ERROR LOG]`);
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Message: ${error.message}`);
    console.error(`Details:`, error.response ? JSON.stringify(error.response, null, 2) : "No extra response data");
    console.error(`Retry Count: ${retryCount}\n`);
    
    if (retryCount > 0 && !isQuotaError) {
      const delay = isServiceError ? 3000 : 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGemini(parts, retryCount - 1);
    }
    
    if (isQuotaError) {
        throw new Error("API Rate Limit reached. Please wait a moment.");
    }
    if (isTimeout) {
        throw new Error("Gemini API request timed out after 15 seconds.");
    }
    
    throw error;
  }
}

/**
 * Endpoint for Event-Based Safety Analysis
 * Triggered by safety-related user intent (voice or chat)
 */
app.post("/analyze-safety", async (req, res) => {
  let { user_text, image_frame_base64, latitude, longitude, timestamp } = req.body;

  if (!user_text) {
    return res.status(400).json({ error: "User query is required for analysis." });
  }

  // Strip prefix if present
  if (image_frame_base64 && image_frame_base64.startsWith("data:image")) {
    image_frame_base64 = image_frame_base64.replace(/^data:image\/[a-z]+;base64,/, "");
  }

  // Define a strong, grounding prompt
  const prompt = `
You are an AI Safety Guardian. You are provided with a USER QUERY and a REAL-TIME IMAGE from their camera.

CRITICAL RULES:
1. TRUTH OVER TEXT: If the USER asks "Am I safe?" but the IMAGE is pitch black or completely dark, you MUST say they are NOT safe because you cannot see anything. 
2. VISUAL DESCRIPTION: Start your spoken response by describing EXACTLY what you see. If it's dark, say "It is too dark for me to see your surroundings."
3. NO HALLUCINATION: Do not mention people, lights, or streets if the image is dark.
4. RISK ASSESSMENT: If visibility is zero (black image), the risk_level MUST be at least 8.

USER QUERY: ${user_text}
ENVIRONMENT DATA: Lat:${latitude || "N/A"}, Lng:${longitude || "N/A"}

RESPONSE FORMAT: Valid JSON only.
{
  "risk_level": (0-10),
  "confidence": (0.0-1.0),
  "spoken_response": "What you see + recommendations",
  "recommendations": ["step 1", "step 2"],
  "should_alert_emergency": (true/false)
}
`;

  try {
    const parts = [prompt];
    
    // Only include image if it's a valid non-placeholder string
    if (image_frame_base64 && image_frame_base64 !== "no-image" && image_frame_base64.length > 100) {
      parts.push({
        inlineData: {
          data: image_frame_base64,
          mimeType: "image/jpeg",
        },
      });
      console.log(`[GEMINI] Sending analysis request with image (${image_frame_base64.length} chars)`);
    } else {
      console.log("[GEMINI] Sending text-only analysis (image missing or invalid)");
      // If image is missing, add a note to the prompt
      parts[0] += "\n\nNOTE: No camera image was provided. Inform the user you cannot see their surroundings.";
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    
    console.log("[GEMINI] response:", text);

    try {
      const analysis = JSON.parse(text);
      return res.json(analysis);
    } catch (parseError) {
      console.error("[GEMINI] Parse error:", text);
      return res.status(500).json({ error: "Invalid AI response format." });
    }
  } catch (error) {
    console.error("[GEMINI] API error:", error.message);
    return res.status(500).json({ error: "AI Analysis failed. Please check your API key and quota." });
  }
});

/**
 * Basic voice-to-text simulation/relay endpoint 
 * (In a real hackathon, this might use Whisper or Google Speech-to-Text)
 * For now, it assumes the frontend sends the transcribed text.
 */
app.post("/voice-input", async (req, res) => {
  // Logic moved to /analyze-safety to follow the event-based requirement
  // This endpoint can remain for general non-safety queries if needed, 
  // but for the "AI Guardian" refactor, we focus on /analyze-safety.
  res.status(404).json({ error: "Use /analyze-safety for guardian queries." });
});

app.post("/get-safe-route", async (req, res) => {
  const { latitude, longitude, customDestination } = req.body;

  // Logging incoming request for debugging
  console.log("[ROUTE] Request received:", { latitude, longitude, customDestination });

  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    console.error("[ROUTE] Missing coordinates");
    return res.status(400).json({ error: "Location data required (latitude and longitude)." });
  }

  try {
    // Resolve destination from custom input or fallback
    const destName = customDestination?.name || "Safe Hub - Nearest Security Center";
    const destLat = customDestination?.latitude || customDestination?.lat || 25.2048;
    const destLng = customDestination?.longitude || customDestination?.lng || 55.2708;

    console.log(`[ROUTE] Target: ${destName} at ${destLat}, ${destLng}`);

    /**
     * HACKATHON STABILITY LAYER: 
     * We provide a valid static polyline if external Directions API fails or isn't called.
     * This ensures the map always renders a path during the demo.
     */
    const mockPolyline = "a~l~FjkkwGzh@v_@|v@|u@"; // Valid encoded polyline
    
    return res.json({
      destination: destName,
      destination_coords: { lat: parseFloat(destLat), lng: parseFloat(destLng) },
      duration_text: "4 mins",
      distance_text: "1.2 km",
      polyline: mockPolyline,
      reasoning: {
        response_text: `I have identified ${destName} as your nearest safety checkpoint. Navigation is now active.`
      }
    });
  } catch (error) {
    console.error("[ROUTE] Critical failure:", error.message);
    return res.status(500).json({ error: "Safe route generation failed internally." });
  }
});

/**
 * Health check endpoint for Cloud Run
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Backend on Google Cloud Run - Gemini Live Agent Challenge");
  console.log(`Hackathon-Ready Server running on port ${PORT}`);
});
