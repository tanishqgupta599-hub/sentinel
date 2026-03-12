import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google AI client with the API key from environment variables
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/**
 * Converts a base64 encoded image to a GoogleGenerativeAI.Part object.
 * @param {string} imageBase64 The base64 encoded image string.
 * @returns {object} The part object for the Gemini API.
 */
function fileToGenerativePart(imageBase64) {
  return {
    inlineData: {
      data: imageBase64,
      mimeType: "image/jpeg",
    },
  };
}

/**
 * Calls the Gemini API using the SDK to analyze the safety of a given situation.
 * @param {string} promptText The user's text query.
 * @param {string} imageBase64 The base64 encoded image frame.
 * @param {string} modelName The name of the model to use (e.g., 'gemini-1.5-flash').
 * @returns {Promise<string>} The raw text response from the model.
 */
async function analyzeSafetyWithGenai(promptText, imageBase64, modelName = 'gemini-2.5-flash') {
  console.log(`[SDK] Attempting to call model: ${modelName}`);
  
  const model = genAI.getGenerativeModel({ model: modelName });

  const parts = [
    { text: promptText },
  ];

  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      }
    });
  }

  // Use the simpler API: generateContent(parts) or generateContent({ contents: [{ parts }] })
  // The SDK documentation often shows model.generateContent(parts)
  try {
    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();
    console.log(`[SDK] Successfully received response from ${modelName}`);
    return text;
  } catch (error) {
    console.error(`[SDK] CRITICAL ERROR calling ${modelName}:`, error);
    throw error;
  }
}

export { analyzeSafetyWithGenai };
