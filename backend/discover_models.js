const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function discoverModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    console.log("Listing all available models for your API key...");
    // Using native fetch to bypass SDK model constraints for discovery
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (!data.models) {
      console.log("❌ No models returned. Response:", JSON.stringify(data));
      return;
    }

    console.log("\n✅ AVAILABLE MODELS FOUND:");
    const candidates = [];
    data.models.forEach(m => {
      console.log(`- ${m.name} (${m.supportedGenerationMethods.join(", ")})`);
      if (m.supportedGenerationMethods.includes("generateContent")) {
        candidates.push(m.name.replace("models/", ""));
      }
    });

    console.log("\nTesting the most promising candidate...");
    for (const modelName of candidates) {
        try {
            console.log(`\nTesting ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("test");
            console.log(`🌟 SUCCESS! ${modelName} is working.`);
            return;
        } catch (e) {
            console.log(`❌ ${modelName} failed: ${e.message}`);
        }
    }

  } catch (e) {
    console.log("❌ Discovery failed:", e.message);
  }
}

discoverModels();
