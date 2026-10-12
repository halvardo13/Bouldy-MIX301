# Bouldy — AI climbing coach

A mobile-first React + Express prototype for an AI bouldering coach.

## What it does

The app includes onboarding and a personalized dashboard, workout and warm-up guides, workout history, and an AI coach chat. The chat can use climbing preferences from the profile and the latest video-analysis report for context. Injury notes, body measurements, account details, and the original video are not sent with chat requests.

For video analysis:
1. The browser loads the selected climbing video locally.
2. The browser samples 4–8 representative frames; the original video is not uploaded.
3. The sampled frames are sent to the Express backend.
4. The backend calls Google AI Studio Gemini with the frames as image inputs.
5. The report shows scores, the biggest opportunity, key moments, drills, and sampled frames.

This is intentionally an MVP. It does **not** yet perform continuous pose tracking, hold detection, route reconstruction, or biomechanics measurement.

## Requirements

- Node.js 20+
- A Google AI Studio API key

## Run locally

```bash
npm install
# Add GEMINI_API_KEY and GEMINI_MODEL=gemini-3.8-flash to .env
npm run dev
```

The server defaults to `gemini-3.8-flash`. If you select a different `GEMINI_MODEL`, make sure it is available to your Google AI Studio project and supports image input. Check Google's [model list](https://ai.google.dev/gemini-api/docs/models) for current availability.

You should see both the Vite client and API server start. Then open:

http://localhost:5173

The API runs at:

http://localhost:8787

## Deploy free on Render

The root `render.yaml` Blueprint creates a free API web service and a free static frontend. Both deploy from the same Git repository.

1. Push this project to GitHub, then in Render choose **New → Blueprint** and connect the repository.
2. When prompted, enter `GEMINI_API_KEY` for the `bouldy-api` service. The key stays server-side; do not add it to the frontend.
3. Deploy the Blueprint. It connects the frontend to the API and automatically rebuilds both services on pushes to the connected branch.
4. Open the `bouldy-frontend` URL shown in Render.

The API uses `GEMINI_MODEL=gemini-3.8-flash` by default in the Blueprint. Change it in the Render API service's environment settings if needed. Free API services may sleep while idle, so the first chat or analysis request after a quiet period can take longer.

To deploy manually instead, create a Render **Web Service** with build command `npm ci` and start command `npm start`, then create a **Static Site** with build command `npm ci && npm run build`, publish directory `dist`, and `VITE_API_URL` set to the API service's Render hostname. Set `GEMINI_API_KEY` only on the API service.

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
- `model_not_found` or a model-access error → check the model ID and whether it is available to your project. For video analysis, choose a currently supported model that accepts image input.
- `provider_timeout` → Google AI Studio did not respond within 2 minutes; try again later. Analysis sends four resized frames to limit request size.

The browser shows the API's error and HTTP status. For an HTTP 500 with no error details, check the API server terminal and confirm `GEMINI_API_KEY` is set in `.env`, then restart `npm run dev`. The repository does not include a configured `.env`; create it from `.env.example` and add your own key.
