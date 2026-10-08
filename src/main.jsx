import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// Leave this empty during local development so Vite's proxy can route /api requests.
const API = import.meta.env.VITE_API_URL || "";

// Keep displayed times consistent in the video metadata and sampled-frame labels.
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Turn the model's numeric score into a short description if you want to show one.
function scoreLabel(score) {
  if (score >= 8) return "Strong";
  if (score >= 6) return "Good";
  if (score >= 4) return "Developing";
  return "Focus area";
}

export default function App() {
  // Refs point to DOM elements that need imperative browser APIs (video seeking and canvas drawing).
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State drives the visible UI. Updating state makes React render the affected parts again.
  const [videoUrl, setVideoUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [frames, setFrames] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  // Keep this in sync with the range input's min/max if you change the allowed frame count.
  const [frameCount, setFrameCount] = useState(4);

  // Videos are loaded as temporary local object URLs; release each URL when it is replaced.
  useEffect(() => () => videoUrl && URL.revokeObjectURL(videoUrl), [videoUrl]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file.");
      return;
    }

    // A new video starts a fresh analysis, but preserves the user's frame-count preference.
    setError("");
    setAnalysis(null);
    setFrames([]);
    setChatMessages([]);
    setChatError("");
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setStatus("ready");
  }

  // Seek through the local video and capture evenly spaced, compressed JPEG stills.
  // This sends only selected frames to the server, not the original video file.
  async function extractFrames() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !duration) return [];

    // Sample the middle of each interval so the first and last frames are not at video edges.
    const times = Array.from({ length: frameCount }, (_, i) =>
      Math.min(duration - 0.05, (duration * (i + 0.5)) / frameCount)
    );

    const out = [];
    for (const time of times) {
      // currentTime is asynchronous: wait until the browser has finished seeking before drawing.
      await new Promise((resolve) => {
        const done = () => {
          video.removeEventListener("seeked", done);
          resolve();
        };
        video.addEventListener("seeked", done);
        video.currentTime = time;
      });

      // Limit image dimensions and JPEG quality to keep the multimodal request manageable.
      const maxWidth = 512;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
      out.push({ time, image: dataUrl });
    }
    return out;
  }

  // Prepare frames, call the backend, and store either the returned report or a visible error.
  async function analyse() {
    if (!videoUrl) return;
    setError("");
    setStatus("extracting");
    try {
      // Extract first so the UI can show the exact images included in this analysis.
      const sampled = await extractFrames();
      setFrames(sampled);
      setStatus("analysing");

      // The server owns the Gemini API key; only frame data and basic video details leave the browser.
      const response = await fetch(`${API}/api/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoName: fileName,
          duration,
          frames: sampled.map((f) => ({ time: f.time, image: f.image }))
        })
      });

      // Read as text first so a non-JSON error response can still produce a useful message.
      const responseBody = await response.text();
      let data = {};
      if (responseBody) {
        try {
          data = JSON.parse(responseBody);
        } catch {
          throw new Error(
            `The analysis server returned an invalid response (${response.status}). Check that the API server is running and review its terminal output.`
          );
        }
      }

      // Prefer an actionable server message, with HTTP details as a fallback.
      if (!response.ok) {
        const serverMessage = [data.error, data.message]
          .find((value) => typeof value === "string" && value.trim());
        const details = serverMessage
          || (data.code ? `Error code: ${data.code}` : "")
          || (Object.keys(data).length ? JSON.stringify(data).slice(0, 500) : "")
          || response.statusText
          || "The server returned no error details. Check the API server terminal and confirm GEMINI_API_KEY is set in .env.";
        throw new Error(
          `Analysis request failed (HTTP ${response.status}): ${details}`
        );
      }
      if (!responseBody) {
        throw new Error(
          "The analysis server returned an empty response. Check that the API server is running and review its terminal output."
        );
      }
      setAnalysis(data);
      setSelectedFrame(0);
      setStatus("done");
    } catch (err) {
      // Restore the controls after failure so the user can retry without reloading the page.
      const message = err?.message === "Failed to fetch"
        ? "Could not reach the analysis server. Make sure you started the app with `npm run dev` and that the API server is running on port 8787."
        : (err.message || "Something went wrong.");
      setError(message);
      setStatus("ready");
    }
  }

  async function sendChatMessage(event) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatLoading(true);
    setChatError("");
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: chatMessages.slice(-12),
          videoName: fileName,
          analysis
        })
      });
      const responseBody = await response.text();
      let data = {};
      if (responseBody) {
        try {
          data = JSON.parse(responseBody);
        } catch {
          throw new Error(
            `The chat server returned an invalid response (${response.status}). Check that the API server is running and review its terminal output.`
          );
        }
      }
      if (!response.ok) {
        const serverMessage = [data.error, data.message]
          .find((value) => typeof value === "string" && value.trim());
        throw new Error(serverMessage || `Chat request failed (HTTP ${response.status}).`);
      }
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The chat server returned an empty reply. Please try again.");
      }

      setChatMessages((previous) => [
        ...previous,
        { role: "user", text: message },
        { role: "model", text: data.reply }
      ]);
      setChatInput("");
    } catch (err) {
      setChatError(err?.message === "Failed to fetch"
        ? "Could not reach the chat server. Make sure the API server is running."
        : (err.message || "The coach could not answer. Please try again."));
    } finally {
      setChatLoading(false);
    }
  }

  // Play the source video from a report timestamp or a sampled-frame thumbnail.
  function jumpTo(time) {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  }

  const currentFrame = frames[selectedFrame];

  // The page is split into the upload/controls column, report column, and sampled-frame strip.
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">C</div>
          <div>
            <strong>ClimbCoach</strong>
            <span>AI technique analysis</span>
          </div>
        </div>
        <div className="pill">Prototype</div>
      </header>

      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">YOUR AI CLIMBING COACH</div>
            <h1>Climb smarter.<br/><em>Move better.</em></h1>
            <p>Upload a climbing video and get movement-by-movement feedback on body position, footwork, efficiency and technique.</p>
          </div>
          <div className="hero-card">
            <span>ANALYSIS</span>
            <strong>Technique · Footwork · Body position</strong>
            <small>Powered by multimodal AI</small>
          </div>
        </section>

        <section className="workspace">
          <div className="left">
            {/* Show either the upload prompt or the selected local video. */}
            <div className="panel video-panel">
              {!videoUrl ? (
                <label className="dropzone">
                  <input type="file" accept="video/*" onChange={handleFile} />
                  <div className="upload-icon">↑</div>
                  <strong>Drop your climbing video here</strong>
                  <span>or click to choose a file · MP4, MOV, WebM</span>
                </label>
              ) : (
                <>
                  <div className="video-wrap">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    />
                  </div>
                  <div className="video-meta">
                    <div>
                      <strong>{fileName}</strong>
                      <span>{formatTime(duration)} · {frames.length || "—"} sampled frames</span>
                    </div>
                    <button className="secondary" onClick={() => document.getElementById("file-input").click()}>Change video</button>
                  </div>
                  <input id="file-input" hidden type="file" accept="video/*" onChange={handleFile} />
                </>
              )}
              <canvas ref={canvasRef} hidden />
            </div>

            {/* The slider controls how many evenly spaced stills the next analysis sends. */}
            <div className="panel controls">
              <div className="analysis-settings">
                <div>
                  <span className="label">ANALYSIS MODE</span>
                  <strong>Technique coach</strong>
                  <small>{frameCount} representative frames · movement-level critique</small>
                </div>
                <label className="frame-count-control" htmlFor="frame-count">
                  <span>
                    Frames to analyse
                    <output htmlFor="frame-count">{frameCount}</output>
                  </span>
                  <input
                    id="frame-count"
                    type="range"
                    min="4"
                    max="8"
                    step="1"
                    value={frameCount}
                    disabled={status === "extracting" || status === "analysing"}
                    onChange={(event) => setFrameCount(Number(event.target.value))}
                  />
                  <span className="frame-count-range" aria-hidden="true">
                    <span>4</span>
                    <span>8</span>
                  </span>
                </label>
              </div>
              <button
                className="primary"
                disabled={!videoUrl || status === "extracting" || status === "analysing"}
                onClick={analyse}
              >
                {status === "extracting" ? "Extracting frames…" :
                 status === "analysing" ? "Coach is analysing…" :
                 analysis ? "Analyse again" : "Analyse my climb →"}
              </button>
            </div>

            {error && <div className="error">{error}</div>}
          </div>

          <aside className="right">
            {!analysis ? (
              /* Empty state before the first successful analysis. */
              <div className="panel empty">
                <div className="empty-mark">✦</div>
                <h2>Your coaching report</h2>
                <p>Upload a video and start an analysis. The coach will look for useful movement patterns rather than just describing what is visible.</p>
                <div className="feature-list">
                  <div>◉ <span>Body positioning & hip movement</span></div>
                  <div>◉ <span>Footwork & lower-body efficiency</span></div>
                  <div>◉ <span>Arm extension & over-gripping</span></div>
                  <div>◉ <span>Specific drills to practise</span></div>
                </div>
              </div>
            ) : (
              /* Render the report sections returned by the backend. */
              <div className="report">
                <div className="report-head">
                  <div>
                    <span className="eyebrow">COACHING REPORT</span>
                    <h2>{analysis.headline}</h2>
                  </div>
                  <div className="score">{analysis.overallScore}<small>/10</small></div>
                </div>

                <div className="scores">
                  {(analysis.scores || []).map((s) => (
                    <div className="score-row" key={s.category}>
                      <div><span>{s.category}</span><b>{s.score}/10</b></div>
                      <div className="bar"><i style={{ width: `${s.score * 10}%` }} /></div>
                    </div>
                  ))}
                </div>

                <div className="coach-card">
                  <span className="label">BIGGEST OPPORTUNITY</span>
                  <h3>{analysis.biggestOpportunity?.title}</h3>
                  <p>{analysis.biggestOpportunity?.explanation}</p>
                  <strong>Try this: </strong>{analysis.biggestOpportunity?.drill}
                </div>

                <div className="timeline">
                  <div className="label">KEY MOMENTS</div>
                  {(analysis.moments || []).map((m, i) => (
                    <button className="moment" key={i} onClick={() => jumpTo(m.time)}>
                      <span className="time">{formatTime(m.time)}</span>
                      <div>
                        <strong>{m.title}</strong>
                        <span>{m.feedback}</span>
                      </div>
                      <b>→</b>
                    </button>
                  ))}
                </div>

                <div className="drills">
                  <div className="label">PRACTICE NEXT</div>
                  {(analysis.drills || []).map((d, i) => (
                    <div className="drill" key={i}>
                      <div className="drill-num">{i + 1}</div>
                      <div><strong>{d.name}</strong><span>{d.instructions}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="panel chat-panel" aria-labelledby="chat-title">
          <div className="chat-heading">
            <div>
              <span className="eyebrow">ASK YOUR COACH</span>
              <h2 id="chat-title">Climbing questions, answered</h2>
              <p>{analysis
                ? "Your coach can refer to your latest video report."
                : "Ask about technique, training, or climbing movement."}</p>
            </div>
            <div className="chat-online"><span /> AI COACH</div>
          </div>
          <div className="chat-transcript" aria-live="polite" aria-busy={chatLoading}>
            {chatMessages.length === 0 ? (
              <div className="chat-message coach-message">
                <span className="chat-avatar">C</span>
                <p>Hey! I’m your climbing coach. What would you like help with?</p>
              </div>
            ) : chatMessages.map((item, index) => (
              <div
                className={`chat-message ${item.role === "user" ? "user-message" : "coach-message"}`}
                key={`${index}-${item.role}`}
              >
                {item.role === "model" && <span className="chat-avatar">C</span>}
                <p>{item.text}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-message coach-message">
                <span className="chat-avatar">C</span>
                <p className="chat-thinking">Thinking through that…</p>
              </div>
            )}
          </div>
          {chatError && <div className="chat-error" role="alert">{chatError}</div>}
          <form className="chat-form" onSubmit={sendChatMessage}>
            <textarea
              aria-label="Ask the climbing coach a question"
              placeholder="Ask about footwork, body position, training…"
              rows="2"
              maxLength="2000"
              value={chatInput}
              disabled={chatLoading}
              onChange={(event) => setChatInput(event.target.value)}
            />
            <button className="primary" type="submit" disabled={chatLoading || !chatInput.trim()}>
              {chatLoading ? "Sending…" : "Ask coach →"}
            </button>
          </form>
          <small className="chat-note">Coaching guidance only — not a substitute for in-person coaching or medical advice.</small>
        </section>

        {/* The thumbnails let users check the captured frames and jump to their timestamps. */}
        {frames.length > 0 && (
          <section className="panel frames">
            <div className="frames-head">
              <div>
                <span className="label">SAMPLED FRAMES</span>
                <strong>What the AI saw</strong>
              </div>
              <span>{frames.length} frames</span>
            </div>
            <div className="frame-grid">
              {frames.map((f, i) => (
                <button key={i} className={selectedFrame === i ? "frame selected" : "frame"} onClick={() => { setSelectedFrame(i); jumpTo(f.time); }}>
                  <img src={f.image} />
                  <span>{formatTime(f.time)}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer>Prototype · AI feedback is coaching guidance, not a substitute for an in-person climbing coach.</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
