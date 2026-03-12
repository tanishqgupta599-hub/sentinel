import express from "express";
import cors from "cors";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not defined.");
  process.exit(1); 
}

import { analyzeSafetyWithGenai } from './geminiClient.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/**
 * Direct REST call to Gemini API
 */
async function callGeminiRest(payload, modelName = "gemini-2.0-flash") {
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  
  console.log(`[REST] Calling model: ${modelName}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: payload })
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`[REST] Error from ${modelName}:`, JSON.stringify(data.error || data));
    throw new Error(data.error?.message || `API Error ${response.status}`);
  }

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error(`[REST] Invalid response structure from ${modelName}:`, JSON.stringify(data));
    throw new Error("Invalid response structure from Gemini API");
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * DEBUG ENDPOINT: Lists ALL models available to this API key
 */
app.get("/debug-api", async (req, res) => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to list models");
    }

    const models = data.models || [];
    // Filter for models that support generateContent
    const generateModels = models
      .filter(m => m.supportedGenerationMethods.includes("generateContent"))
      .map(m => ({
        name: m.name.replace("models/", ""),
        displayName: m.displayName,
        description: m.description
      }));

    res.json({
      status: "success",
      count: generateModels.length,
      availableModels: generateModels,
      message: "Model versions updated to 2.x series based on your list.",
      apiKeyDefined: !!GEMINI_API_KEY,
      nodeVersion: process.version
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      tip: "If this says 403, your key is invalid. Check Render Environment variables."
    });
  }
});

app.post("/analyze-safety", async (req, res) => {
  let { user_text, image_frame_base64, latitude, longitude } = req.body;

  if (!user_text) return res.status(400).json({ error: "User query is required." });

  // Ensure image is clean
  if (image_frame_base64 && image_frame_base64.startsWith("data:image")) {
    image_frame_base64 = image_frame_base64.replace(/^data:image\/[a-z]+;base64,/, "");
  }

  const prompt = `
SYSTEM INSTRUCTION: You are an AI Safety Guardian. YOU MUST PRIORITIZE THE IMAGE DATA.
USER QUERY: ${user_text}
ENVIRONMENT: Lat:${latitude || "N/A"}, Lng:${longitude || "N/A"}

CRITICAL RULES:
1. If the image is PITCH BLACK, DARK, or the lens is covered, you MUST say: "I cannot see your surroundings. It is pitch black. High-risk situation."
2. DO NOT assume safety if the image is dark. DARKNESS = UNKNOWN = HIGH RISK.
3. If it is dark, ALWAYS recommend moving to an area with more lighting or a well-lit public space.
4. Start your response with a brief visual description of what you see.
5. If you see people, describe their behavior. If you see a clear path, describe it.

FORMAT: You MUST respond in valid JSON format ONLY.
{
  "risk_level": number (1-10),
  "confidence": number (0-1),
  "spoken_response": "string",
  "recommendations": ["string"],
  "should_alert_emergency": boolean
}
`;

  try {
    const contents = [{
      parts: [
        { text: prompt }
      ]
    }];

    // Only add image if it exists and looks valid
    const hasImage = image_frame_base64 && image_frame_base64 !== "no-image" && image_frame_base64.length > 100;
    
    if (hasImage) {
      contents[0].parts.push({
        inline_data: { mime_type: "image/jpeg", data: image_frame_base64 }
      });
      console.log(`[GEMINI] Sending multimodal request (${image_frame_base64.length} bytes image)`);
    } else {
      console.log("[GEMINI] Sending text-only request (No image provided)");
    }

    // SDK-first approach with REST fallback
    let textRaw;
    try {
      console.log("[STRATEGY] Using SDK as primary...");
      textRaw = await analyzeSafetyWithGenai(prompt, image_frame_base64, 'gemini-2.5-flash');
    } catch (sdkError) {
      console.warn(`[STRATEGY] SDK failed: ${sdkError.message}. Falling back to REST...`);
      try {
        // Fallback to the original, resilient REST implementation
        const contents = [{ parts: [{ text: prompt }] }];
        if (image_frame_base64) {
          contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: image_frame_base64 } });
        }
        textRaw = await callGeminiRest(contents, "gemini-2.5-flash");
      } catch (restError) {
        console.error("[STRATEGY] Both SDK and REST fallback failed.");
        throw new Error("AI services are temporarily unavailable. Please try again later.");
      }
    }

    const text = textRaw.replace(/```json|```/g, "").trim();
    return res.json(JSON.parse(text));
  } catch (error) {
    console.error("CRITICAL AI ERROR:", error.message);
    return res.status(500).json({ 
      status: "error",
      error: `AI Analysis failed: ${error.message}`,
      recommendation: "Please check if your Gemini API key has access to 'gemini-2.0-flash' or 'gemini-2.5-flash' in your region."
    });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", version: "2.0.0-SDK-STABLE" }));

app.post("/get-safe-route", (req, res) => res.json({
  destination: "Nearest Security Center",
  polyline: "a~l~FjkkwGzh@v_@|v@|u@",
  reasoning: { response_text: "Navigation active." }
}));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT} - v2.0.0 (SDK STABLE)`));
