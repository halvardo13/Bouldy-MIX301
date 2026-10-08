# ClimbCoach AI — working prototype

A small React + Express prototype for an AI climbing coach.

## What it does

1. User selects a climbing video.
2. The browser loads the video locally — it is not uploaded to your server as a video file.
3. The browser samples 4 representative frames.
4. Those frames are sent to the Express backend.
5. The backend calls the Google AI Studio Gemini API with the frames as image inputs.
6. The model returns structured coaching JSON.
7. The UI shows scores, the biggest opportunity, key moments, drills, and sampled frames.

This is intentionally an MVP. It does **not** yet perform continuous pose tracking, hold detection, route reconstruction, or biomechanics measurement.

## Requirements

- Node.js 20+
- A Google AI Studio API key

## Run locally

```bash
npm install
cp .env.example .env
# Add your Google AI Studio API key to .env
npm run dev
```

Replace `GEMINI_API_KEY` in `.env` with a key from Google AI Studio before running analysis. The default model is `gemini-2.5-flash-lite`, Google's faster, lighter multimodal option; set `GEMINI_MODEL` to another Gemini model available to your project if needed. Gemini 2.0 Flash and Flash-Lite model IDs were shut down on June 1, 2026; use a currently supported model ID instead. Gemini 2.5 Flash and Flash-Lite remain listed as supported models. Check Google's [model list](https://ai.google.dev/gemini-api/docs/models) and [deprecation schedule](https://ai.google.dev/gemini-api/docs/deprecations) for current availability.

You should see both the Vite client and API server start. Then open:

http://localhost:5173

The API runs at:

http://localhost:8787

## Important

Never put `GEMINI_API_KEY` in frontend code or a `VITE_` environment variable. The key belongs only on the server.

## Recommended next step

For a stronger production version, replace sparse frame sampling with:
- scene/route detection
- person pose estimation
- temporal tracking across frames
- climbing-hold detection
- move segmentation
- route-relative body metrics
- AI reasoning over the structured movement data

The current prototype is useful for validating the product experience and the coaching/report format before investing in the harder computer-vision layer.


## If you see "NetworkError when attempting to fetch resource"

The browser needs the API server running too. `npm run dev` starts both processes.

You can verify the API independently by opening:

http://localhost:5173/api/health

It should return JSON containing `"ok": true`.

If the API is not running, check the terminal for an error from `server/index.js`. The most common cause is a missing `GEMINI_API_KEY` in `.env`.


## Troubleshooting the analysis request

If the UI reports an API error, look at the terminal running `npm run dev`. The server prints the Google AI Studio error.

For example:
- `400` / `403` → check the API key, model name, and Google AI Studio project access.
- `429` / quota or billing message → the API account cannot make the request.
- model access error → change `GEMINI_MODEL` to a model available to your project.
- `empty_model_output` → the request reached Google AI Studio but did not produce usable text.
- `provider_network_error` → the server could not complete its connection to Google AI Studio; check internet access, VPN, and firewall settings.
- `provider_overloaded` → Google AI Studio is temporarily busy or rate-limiting requests; the server retries HTTP 503 responses up to three times with exponential backoff before returning the error. If it persists, retry later. A 503 is not evidence that a model ID has been retired.
- `model_not_found` or a model-access error → check the model ID and whether it is available to your project. Retired Gemini 2.0 model IDs cannot be restored by retrying; select a supported model such as `gemini-2.5-flash-lite`.
- `provider_timeout` → Google AI Studio did not respond within 2 minutes; try again later. Analysis sends four resized frames to limit request size.

The browser shows the API's error and HTTP status. For an HTTP 500 with no error details, check the API server terminal and confirm `GEMINI_API_KEY` is set in `.env`, then restart `npm run dev`. The repository does not include a configured `.env`; create it from `.env.example` and add your own key.
