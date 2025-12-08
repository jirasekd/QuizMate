/*// server.js
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// middlewares
app.use(express.json());
app.use(express.static(__dirname)); // servíruje index.html, css, js, obrázky z kořene

if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  Chybí OPENAI_API_KEY v .env — /api/chat nebude fungovat.");
}

// Volání OpenAI (Node 18+ má fetch vestavěný)
async function callOpenAI(messages) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      // Změň na model, který máš k dispozici (např. gpt-4o, gpt-4o-mini, o3-mini…)
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages
    })
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`OpenAI ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "(empty response)";
}

// API endpoint pro chat
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages musí být neprázdné pole" });
    }
    const reply = await callOpenAI(messages);
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server běží na http://localhost:${PORT}`);
});
*/

// server.js — Gemini backend (CommonJS)
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

app.use(express.json({ limit: '50mb' }));

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.warn("⚠️  Chybí GOOGLE_API_KEY v .env — /api/chat nebude fungovat.");
}

// --- ROUTING ORDER ---
// 1. API Routes: Define API endpoints first so they are matched before the static file server or SPA catch-all.
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages musí být neprázdné pole" });
    }
    
    console.log("Received messages:", messages); // DEBUG
    const reply = await callGemini(messages);
    console.log("Replying with:", reply); // DEBUG
    res.json({ reply });
  } catch (e) {
    console.error("API error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Maps OpenAI-style messages to Gemini "contents" format
function toGeminiContents(openAiMessages) {
  // Gemini roles: "user" or "model"
  // OpenAI roles: 'user' | 'assistant' | 'system'
  // System zprávy sloučíme na začátek jako user text (nejjednodušší varianta).
  const contents = [];
  for (const m of openAiMessages) {
    let role = m.role === "assistant" ? "model" : "user";
    const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    contents.push({
      role,
      parts: [{ text }]
    });
  }
  return contents;
}

// Volání Gemini REST API (non-stream)
async function callGemini(openAiMessages) {
  if (!API_KEY) {
    throw new Error("GOOGLE_API_KEY is missing in .env file");
  }

  const contents = toGeminiContents(openAiMessages);

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 16000  // Increased to 16k for comprehensive notes
    }
  };

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const resp = await fetch(`${url}?key=${encodeURIComponent(API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Gemini ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  console.log("Gemini response:", JSON.stringify(data, null, 2)); // DEBUG: log full response

  // Check for finish reason to see if response was truncated
  if (data?.candidates?.[0]) {
    const cand = data.candidates[0];
    if (cand.finishReason && cand.finishReason !== "STOP") {
      console.warn(`⚠️ Response finished with reason: ${cand.finishReason} (may be truncated)`);
    }
  }

  // Check for safety block first
  if (data?.promptFeedback?.safetyRatings) {
    const blocked = data.promptFeedback.safetyRatings.find(r => r.probability === "HIGH" && r.blocked);
    if (blocked) {
      return "⚠️ Response blocked by Gemini safety filters.";
    }
  }

  // Extract text from candidates
  if (data?.candidates?.[0]) {
    const cand = data.candidates[0];
    if (cand.content?.parts?.length > 0) {
      const text = cand.content.parts.map(p => p.text || "").filter(Boolean).join("\n");
      if (text) return text;
    }
  }

  // If we reach here, log what we got and throw error
  console.error("Failed to extract text from Gemini response:", JSON.stringify(data, null, 2));
  throw new Error("Gemini returned empty or malformed response");
}

// 2. Static Files: Serve files like main.js, style.css, etc., from the 'public' directory.
app.use(express.static(path.join(__dirname, 'public')));

// 3. SPA Catch-all: For any other GET request that didn't match a static file, send the main index.html.
// This allows the client-side JavaScript to handle routing.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next(); // Skip API calls
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server běží na http://localhost:${PORT}`);
});
