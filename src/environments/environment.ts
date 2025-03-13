// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  huggingfaceApiKey: 'YOUR_HUGGINGFACE_API_KEY', // no longer needed but kept for compatibility
  lmStudioModel: "TheBloke/Mistral-7B-v0.1-GGUF",  // Change this to your model
  lmStudioEndpoint: "http://localhost:1234/v1/completions" // ✅ FIXED endpoint
  // lmStudioEndpoint: 'http://localhost:1234/v1/chat/completions', 
  // lmStudioModel: 'mistral-7b-instruct-v0.2',
  
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
