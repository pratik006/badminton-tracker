/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

//import {onRequest} from "firebase-functions/v2/https";
//import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// In your Firebase Functions (functions/src/index.ts)
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Define the expected data structure
interface GeminiRequest {
  prompt: string;
  players?: any[]; // Adjust the type according to your Player type
  // ... other properties
}

export const getGeminiResponse = functions.https.onCall(
  async (request) => {  // Changed parameter name to 'request'
    // Access data from request.data
    const { prompt, players } = request.data as GeminiRequest;
    const apiKey = functions.config().gemini?.api?.key;

    if (!apiKey) {
      throw new functions.https.HttpsError(
        'internal',
        'Gemini API key is not configured'
      );
    }

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to get response from Gemini',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);