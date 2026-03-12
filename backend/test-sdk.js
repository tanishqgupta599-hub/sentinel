import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("--- SDK Isolation Test ---");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("TEST FAILED: GEMINI_API_KEY is not defined in the environment.");
  process.exit(1);
}

console.log("API Key found. Initializing SDK...");

try {
  const genAI = new GoogleGenerativeAI(apiKey);
  console.log("SDK Initialized successfully.");

  async function runTest() {
    try {
      console.log("\n--- SDK TEST (gemini-2.5-flash) ---");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      console.log("Model instance created. Sending prompt...");
      
      const parts = [{ text: "What is the capital of India?" }];
      const result = await model.generateContent(parts);
      const response = await result.response;
      console.log("SDK SUCCESS:", response.text());

    } catch (error) {
      console.error("\n--- TEST FAILED DURING API CALL ---");
      console.error("Error:", error);
      console.log("------------------------------------\n");
    }
  }

  runTest();

} catch (e) {
  console.error("\n--- TEST FAILED DURING SDK INITIALIZATION ---");
  console.error("Error:", e.message);
  console.log("---------------------------------------------\n");
}
