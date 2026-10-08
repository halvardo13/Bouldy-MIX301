import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT || 8787);
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
const max503Retries = 3;
const maxRetryDelayMs = 30_000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

function getRetryDelay(response, retryIndex) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, maxRetryDelayMs);
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(0, retryAt - Date.now()), maxRetryDelayMs);
    }
  }

  return Math.min(1000 * 2 ** retryIndex + Math.random() * 250, maxRetryDelayMs);
}

async function fetchGeminiWithRetry(options) {
  for (let retryIndex = 0; ; retryIndex += 1) {
    const response = await fetch(geminiEndpoint, options);
    if (response.status !== 503 || retryIndex >= max503Retries) return response;

    const delay = getRetryDelay(response, retryIndex);
    console.warn(
      `Google AI Studio returned HTTP 503; retrying in ${Math.ceil(delay)} ms (${retryIndex + 1}/${max503Retries}).`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

const schema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    overallScore: { type: "number" },
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          score: { type: "number" }
        },
        required: ["category", "score"]
      }
    },
    biggestOpportunity: {
      type: "object",
      properties: {
        title: { type: "string" },
        explanation: { type: "string" },
        drill: { type: "string" }
      },
      required: ["title", "explanation", "drill"]
    },
    moments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          time: { type: "number" },
          title: { type: "string" },
          feedback: { type: "string" }
        },
        required: ["time", "title", "feedback"]
      }
    },
    drills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          instructions: { type: "string" }
        },
        required: ["name", "instructions"]
      }
    }
  },
  required: ["headline", "overallScore", "scores", "biggestOpportunity", "moments", "drills"]
};

function toGeminiSchema(value) {
  const converted = { type: value.type.toUpperCase() };
  if (value.properties) {
    converted.properties = Object.fromEntries(
      Object.entries(value.properties).map(([key, property]) => [key, toGeminiSchema(property)])
    );
  }
  if (value.required) converted.required = value.required;
  if (value.items) converted.items = toGeminiSchema(value.items);
  return converted;
}

function getNetworkErrorDetails(error) {
  const details = [];
  const visited = new Set();
  const inspect = (current) => {
    if (!current || typeof current !== "object" || visited.has(current)) return;
    visited.add(current);
    if (current.code) details.push(current.code);
    if (current.message && current.message !== "fetch failed") details.push(current.message);
    inspect(current.cause);
    if (Array.isArray(current.errors)) current.errors.forEach(inspect);
  };
  inspect(error);
  return [...new Set(details)].join(": ");
}

const systemPrompt = `
You are ClimbCoach, a careful climbing technique coach.
You receive representative video frames sampled from one climbing attempt.
Analyse only what is reasonably visible. Do not invent holds, body positions, or movements that cannot be supported by the frames.
Use climbing vocabulary naturally: hip positioning, centre of gravity, flagging, drop-knee, heel hook, toe hook, silent feet, straight-arm climbing, body tension, sequencing, lock-off, reach, etc.
Do not diagnose injuries or make medical claims.
Prioritise actionable coaching over generic encouragement.
Because these are sparse frames rather than continuous video, explicitly be conservative about timing and movement claims.
Scores are subjective coaching scores, not objective measurements.
Return exactly the requested JSON structure.
`;

app.get("/api/health", (_req, res) => res.json({
  ok: true,
  provider: "Google AI Studio",
  model,
  configured: Boolean(apiKey)
}));

app.post("/api/analyse", async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server. Add your Google AI Studio API key to .env and restart the server."
      });
    }

    const { videoName, duration, frames } = req.body || {};
    if (!Array.isArray(frames) || frames.length < 2) {
      return res.status(400).json({ error: "At least two sampled frames are required." });
    }

    const parts = [{
      text: `
Video: ${videoName || "climbing video"}
Duration: ${Number(duration || 0).toFixed(1)} seconds
There are ${frames.length} sampled frames. Each frame includes its timestamp in the accompanying label.

Give the climber a useful first-pass coaching report. Include 4 scores using:
- Body position
- Footwork
- Movement efficiency
- Arm efficiency

Give 3-5 key moments. Use the actual frame timestamps supplied below. If a timestamp is approximate because the sample is sparse, keep the feedback appropriately cautious.
Give 2-3 drills.

Important: Do not claim you can see continuous motion between frames. If something is uncertain, say so in the feedback.
Scores must be numbers from 1 to 10. Moment timestamps must be non-negative.
`
    }];

    for (const [i, frame] of frames.entries()) {
      const imageMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(frame.image || "");
      if (!imageMatch) {
        return res.status(400).json({ error: `Sampled frame ${i + 1} is not a valid base64 image.` });
      }
      parts.push(
        { text: `FRAME ${i + 1} — timestamp ${Number(frame.time).toFixed(2)} seconds` },
        { inlineData: { mimeType: imageMatch[1], data: imageMatch[2] } }
      );
    }

    const response = await fetchGeminiWithRetry({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: AbortSignal.timeout(120_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(schema),
          maxOutputTokens: 2048
        }
      })
    });

    const responseBody = await response.text();
    let result;
    try {
      result = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      console.error("Google AI Studio returned a non-JSON response:", response.status, responseBody.slice(0, 1000));
      return res.status(502).json({
        error: `Google AI Studio returned an invalid response (HTTP ${response.status}).`,
        code: "invalid_provider_response"
      });
    }

    if (!response.ok) {
      const providerError = result.error || {};
      console.error("Google AI Studio request failed:", response.status, providerError);
      const isOverloaded = response.status === 429 || response.status === 503;
      return res.status(response.status).json({
        error: isOverloaded
          ? `Gemini is temporarily overloaded (HTTP ${response.status}). Wait a minute and try again.${providerError.message ? ` Provider message: ${providerError.message}` : ""}`
          : (providerError.message || `Google AI Studio request failed (HTTP ${response.status}).`),
        code: isOverloaded ? "provider_overloaded" : (providerError.status || "gemini_api_error")
      });
    }

    const raw = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!raw) {
      console.error("Google AI Studio returned no text:", JSON.stringify(result, null, 2));
      return res.status(502).json({
        error: result.promptFeedback?.blockReason
          ? `Google AI Studio blocked the request: ${result.promptFeedback.blockReason}.`
          : "Google AI Studio returned no report text. Check the server terminal for details.",
        code: "empty_model_output"
      });
    }

    let report;
    try {
      report = JSON.parse(raw);
    } catch {
      console.error("Could not parse Google AI Studio output:", raw);
      return res.status(502).json({
        error: "Google AI Studio returned text that was not valid JSON.",
        code: "invalid_model_json",
        raw: raw.slice(0, 1000)
      });
    }

    res.json(report);
  } catch (error) {
    console.error("Google AI Studio request failed:", error);
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    const isNetworkFailure = error?.message === "fetch failed";
    const status = isTimeout ? 504 : isNetworkFailure ? 502 : (error?.status || 500);
    const networkDetails = isNetworkFailure ? getNetworkErrorDetails(error) : "";
    const message = isTimeout
      ? "Google AI Studio did not respond within 2 minutes. The request was stopped; try again later."
      : isNetworkFailure
        ? `Could not connect to Google AI Studio${networkDetails ? ` (${networkDetails})` : ""}. Check your internet connection, VPN, or firewall and try again.`
        : (error?.message || "The AI analysis failed.");
    res.status(status).json({
      error: message,
      code: isTimeout ? "provider_timeout" : isNetworkFailure ? "provider_network_error" : (error?.code || "api_error"),
      type: error?.type || null
    });
  }
});

const server = app.listen(port, () => {
  console.log(`ClimbCoach API running at http://localhost:${port}`);
});

export { server };
