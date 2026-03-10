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

// Initialize the model with explicit v1 API version to avoid v1beta 404 errors
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });

/**
 * DEBUG ENDPOINT: Tests Gemini connectivity with a simple prompt
 */
app.get("/debug-api", async (req, res) => {
  try {
    const result = await model.generateContent("Hello, say 'API IS WORKING'");
    const response = await result.response;
    const text = response.text();
    res.json({
      status: "success",
      geminiResponse: text,
      message: "If you see 'API IS WORKING', the backend is fully functional."
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      tip: "If this says 403, check your API key in Render settings."
    });
  }
});

/**
 * Endpoint for Event-Based Safety Analysis
 */
app.post("/analyze-safety", async (req, res) => {
  let { user_text, image_frame_base64, latitude, longitude, timestamp } = req.body;

  if (!user_text) {
    return res.status(400).json({ error: "User query is required." });
  }

  // Strip prefix
  if (image_frame_base64 && image_frame_base64.startsWith("data:image")) {
    image_frame_base64 = image_frame_base64.replace(/^data:image\/[a-z]+;base64,/, "");
  }

  const prompt = `
SYSTEM INSTRUCTION: You are an AI Safety Guardian.
USER QUERY: ${user_text}
ENVIRONMENT DATA: Lat:${latitude || "N/A"}, Lng:${longitude || "N/A"}

RULES:
1. If the image is DARK or OBSCURED, report high risk.
2. Your spoken_response MUST start with a visual description.
3. If it's black, say: "I cannot see your surroundings. It is pitch black. This is a high-risk situation."

FORMAT: JSON only.
{
  "risk_level": number,
  "confidence": number,
  "spoken_response": "visual description + advice",
  "recommendations": ["step 1", "step 2"],
  "should_alert_emergency": boolean
}
`;

  try {
    const parts = [{ text: prompt }];
    
    if (image_frame_base64 && image_frame_base64 !== "no-image" && image_frame_base64.length > 100) {
      parts.push({
        inlineData: { data: image_frame_base64, mimeType: "image/jpeg" }
      });
    } else {
      parts[0].text += "\n\nNOTE: No image provided. Tell user you cannot see.";
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, "").trim();
    
    try {
      const analysis = JSON.parse(text);
      return res.json(analysis);
    } catch (e) {
      console.error("Parse error:", text);
      return res.status(500).json({ error: "Invalid response format from AI." });
    }
  } catch (error) {
    console.error("API ERROR:", error.message);
    return res.status(500).json({ error: `AI Analysis failed: ${error.message}` });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "1.7.0-STABLE" });
});

app.post("/get-safe-route", async (req, res) => {
  const { latitude, longitude } = req.body;
  return res.json({
    destination: "Nearest Security Center",
    destination_coords: { lat: 25.2048, lng: 55.2708 },
    duration_text: "4 mins",
    distance_text: "1.2 km",
    polyline: "a~l~FjkkwGzh@v_@|v@|u@",
    reasoning: { response_text: "Navigation to safety hub active." }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - Version 1.7.0`);
});
