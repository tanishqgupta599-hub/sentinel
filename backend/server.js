import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not defined.");
  process.exit(1); 
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/**
 * DEBUG ENDPOINT: Tests multiple Gemini models to find one that works
 */
app.get("/debug-api", async (req, res) => {
  const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-pro"];
  const results = {};

  for (const modelName of modelsToTest) {
    try {
      const testModel = genAI.getGenerativeModel({ model: modelName });
      const result = await testModel.generateContent("Say 'OK'");
      const response = await result.response;
      results[modelName] = { status: "success", text: response.text() };
    } catch (error) {
      results[modelName] = { status: "error", message: error.message };
    }
  }

  const workingModel = Object.keys(results).find(m => results[m].status === "success");

  res.json({
    status: workingModel ? "success" : "error",
    workingModel: workingModel || "none",
    allResults: results,
    tip: "Use the 'workingModel' name in your code if any succeeded."
  });
});

/**
 * Robust function to call Gemini with fallbacks
 */
async function callGeminiWithFallback(parts) {
  const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
  let lastError = null;

  for (const modelName of models) {
    try {
      console.log(`[GEMINI] Attempting analysis with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`[GEMINI] Model ${modelName} failed:`, error.message);
      lastError = error;
      if (error.message.includes("403")) throw error; // Key error, don't bother with other models
    }
  }
  throw lastError;
}

/**
 * Endpoint for Event-Based Safety Analysis
 */
app.post("/analyze-safety", async (req, res) => {
  let { user_text, image_frame_base64, latitude, longitude } = req.body;

  if (!user_text) return res.status(400).json({ error: "User query is required." });

  if (image_frame_base64 && image_frame_base64.startsWith("data:image")) {
    image_frame_base64 = image_frame_base64.replace(/^data:image\/[a-z]+;base64,/, "");
  }

  const prompt = `
SYSTEM INSTRUCTION: You are an AI Safety Guardian. You MUST prioritize the camera image over any user text.

USER QUERY: ${user_text}
ENVIRONMENT DATA: Lat:${latitude || "N/A"}, Lng:${longitude || "N/A"}

CRITICAL RULES:
1. TRUTH OVER TEXT: If the USER asks if they are safe but the IMAGE is dark/black, you MUST say they are NOT safe because you cannot see.
2. VISUAL GROUNDING: Your spoken_response MUST start with a visual description of the image.
3. DARKNESS PROTOCOL: If the image is black, say: "I cannot see your surroundings. It is pitch black. This is a high-risk situation."
4. NO GUESSING: Do not mention streets, lights, or people if the image is dark.

FORMAT: JSON only.
{
  "risk_level": (number 0-10, use 8+ for darkness),
  "confidence": (number 0.0-1.0),
  "spoken_response": "visual description + recommendation",
  "recommendations": ["step 1", "step 2"],
  "should_alert_emergency": (boolean)
}
`;

  try {
    const parts = [{ text: prompt }];
    if (image_frame_base64 && image_frame_base64 !== "no-image" && image_frame_base64.length > 100) {
      parts.push({ inlineData: { data: image_frame_base64, mimeType: "image/jpeg" } });
    }

    const textRaw = await callGeminiWithFallback(parts);
    const text = textRaw.replace(/```json|```/g, "").trim();
    
    return res.json(JSON.parse(text));
  } catch (error) {
    console.error("CRITICAL API ERROR:", error.message);
    return res.status(500).json({ 
      error: `AI Analysis failed: ${error.message}`,
      tip: "Check /debug-api to find a working model for your account."
    });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", version: "1.8.0-FALLBACK-ENABLED" }));

app.post("/get-safe-route", (req, res) => res.json({
  destination: "Nearest Security Center",
  destination_coords: { lat: 25.2048, lng: 55.2708 },
  duration_text: "4 mins",
  distance_text: "1.2 km",
  polyline: "a~l~FjkkwGzh@v_@|v@|u@",
  reasoning: { response_text: "Navigation to safety hub active." }
}));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT} - v1.8.0`));
