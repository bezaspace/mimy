import { VertexAI } from "@google-cloud/vertexai";

const project = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || "us-central1";
const modelId = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-lite";

if (!project) {
  throw new Error("GCP_PROJECT_ID is not set");
}

let vertexAI: VertexAI;

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (serviceAccountJson) {
  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
  }

  const clientEmail = serviceAccount.client_email;
  const privateKey = serviceAccount.private_key;

  if (!clientEmail || !privateKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing client_email or private_key");
  }

  vertexAI = new VertexAI({
    project,
    location,
    googleAuthOptions: {
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    },
  });
} else {
  vertexAI = new VertexAI({ project, location });
}

const generativeModel = vertexAI.getGenerativeModel({
  model: modelId,
  generationConfig: {
    maxOutputTokens: 128,
    temperature: 0.2,
  },
});

export interface WhisperSafetyResult {
  overallDecision: string;
  categories: Record<string, number>;
  explanation: string;
  rawText: string;
}

export async function checkWhisperAudioSafety(audio: Buffer, mimeType: string): Promise<WhisperSafetyResult> {
  const base64 = audio.toString("base64");

  const instruction =
    "You are a safety classifier for a dating app voice introduction. " +
    "Listen to the audio and decide if it is safe to send as an opening message. " +
    "Block explicit sexual content, hate or slurs, threats, bullying, and encouragement of self-harm. " +
    "Respond with JSON only, with this exact structure: " +
    "{ \"overall_decision\": \"allow|block|flag\", \"categories\": { \"sexual\": number, \"hate\": number, \"violence\": number, \"harassment\": number, \"self_harm\": number, \"spam\": number }, \"explanation\": string }";

  const request = {
    contents: [
      {
        role: "user",
        parts: [
          { text: instruction },
          {
            inlineData: {
              data: base64,
              mimeType,
            },
          },
        ],
      },
    ],
  } as any;

  const result = await generativeModel.generateContent(request as any);
  const response = (result as any).response;

  const textPart =
    response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const cleaned = textPart
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "");

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    throw new Error("Failed to parse safety model response as JSON");
  }

  const overallDecision =
    parsed.overall_decision || parsed.overallDecision || "block";
  const categories: Record<string, number> = parsed.categories || {};
  const explanation: string = parsed.explanation || "";

  return {
    overallDecision,
    categories,
    explanation,
    rawText: textPart,
  };
}
