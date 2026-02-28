const dotenv = require("dotenv");
dotenv.config();

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("AVAILABLE MODELS:");
      data.models.forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.log("No models found:", data);
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

listModels();
