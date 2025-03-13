export const environment = {
  production: true,
  huggingfaceApiKey: 'YOUR_HUGGINGFACE_API_KEY', // no longer needed but kept for compatibility
  lmStudioModel: "TheBloke/Mistral-7B-v0.1-GGUF",  // Change this to your model
  lmStudioEndpoint: "http://localhost:1234/v1/completions" // ✅ FIXED endpoint
  // lmStudioEndpoint: 'http://localhost:1234/v1/chat/completions', 
  // lmStudioModel: 'mistral-7b-instruct-v0.2',
 
};