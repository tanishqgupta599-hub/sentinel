const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function testModelStability() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const modelsToTest = [
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-2.5-flash"
  ];

  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("test");
      console.log(`✅ ${modelName} works!`);
      return modelName;
    } catch (e) {
      console.log(`❌ ${modelName} failed: ${e.message}`);
    }
  }
}

testModelStability().then(workingModel => {
    if (workingModel) {
        console.log(`\nRECOMMENDED MODEL: ${workingModel}`);
    } else {
        console.log(`\nALL MODELS FAILED.`);
    }
});
