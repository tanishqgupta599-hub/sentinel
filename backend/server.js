import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not defined.");
  process.exit(1); 
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/**
 * Direct REST call to Gemini API
 * Bypasses SDK to avoid 404/URL formatting issues
 */
async function callGeminiRest(payload) {
  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: payload })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || `API Error ${response.status}`);
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * DEBUG ENDPOINT: Tests the direct REST connection
 */
app.get("/debug-api", async (req, res) => {
  try {
    const text = await callGeminiRest([{ parts: [{ text: "Say 'REST API WORKING'" }] }]);
    res.json({
      status: "success",
      geminiResponse: text,
      message: "Direct REST connection successful!"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      tip: "If 403, your key is invalid. Check Render Environment variables."
    });
  }
});

app.post("/analyze-safety", async (req, res) => {
  let { user_text, image_frame_base64, latitude, longitude } = req.body;

  if (!user_text) return res.status(400).json({ error: "User query is required." });

  if (image_frame_base64 && image_frame_base64.startsWith("data:image")) {
    image_frame_base64 = image_frame_base64.replace(/^data:image\/[a-z]+;base64,/, "");
  }

  const prompt = `
SYSTEM INSTRUCTION: You are an AI Safety Guardian. YOU MUST PRIORITIZE THE IMAGE.
USER QUERY: ${user_text}
ENVIRONMENT: Lat:${latitude || "N/A"}, Lng:${longitude || "N/A"}

CRITICAL RULES:
1. If the image is DARK or BLACK, you MUST say you cannot see and report HIGH RISK.
2. Start your response with a visual description of what you see.
3. If the lens is covered, say: "I cannot see your surroundings. It is pitch black. High-risk situation."

FORMAT: Valid JSON only.
{
  "risk_level": number,
  "confidence": number,
  "spoken_response": "visual description + advice",
  "recommendations": ["step 1"],
  "should_alert_emergency": boolean
}
`;

  try {
    const contents = [{
      parts: [{ text: prompt }]
    }];

    if (image_frame_base64 && image_frame_base64 !== "no-image" && image_frame_base64.length > 100) {
      contents[0].parts.push({
        inline_data: { mime_type: "image/jpeg", data: image_frame_base64 }
      });
    }

    const textRaw = await callGeminiRest(contents);
    const text = textRaw.replace(/```json|```/g, "").trim();
    return res.json(JSON.parse(text));
  } catch (error) {
    console.error("REST API ERROR:", error.message);
    return res.status(500).json({ error: `AI Analysis failed: ${error.message}` });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", version: "1.9.0-REST-DIRECT" }));

app.post("/get-safe-route", (req, res) => res.json({
  destination: "Nearest Security Center",
  polyline: "a~l~FjkkwGzh@v_@|v@|u@",
  reasoning: { response_text: "Navigation active." }
}));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT} - v1.9.0 (REST)`));
