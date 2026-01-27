//  --------------------------------
//  Gemini API
//  -------------------------------- 
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require('mongoose'); // Přidáno pro databázi
const cors = require('cors'); // Přidáno pro jistotu, pokud by chybělo

// Načtení .env souboru z aktuálního adresáře (Coding)
dotenv.config();

const app = express();

app.use(express.json({ limit: '16mb' })); //Maximálnáí velikost kterou přijme MongoDB je 16MB
// Servíruj statické soubory (HTML, CSS, JS) pouze z adresáře 'public'
app.use(express.static(path.join(__dirname, "public")));
app.use(cors()); // Povolí komunikaci mezi frontendem a backendem na různých portech (pro vývoj)

// ==================================
//  PŘIPOJENÍ K DATABÁZI
// ==================================
const connectDB = async () => {
  try {
    // Použije MONGO_URI z tvého .env souboru v D:\Quizmate\Coding\
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB připojeno...');
  } catch (err) {
    console.error("❌ Chyba připojení k MongoDB:", err.message);
    process.exit(1); // Ukončí aplikaci, pokud se nepodaří připojit k DB
  }
};
connectDB();

// ==================================
//  DEFINICE API CEST
// ==================================
// Přidáme cesty pro registraci a přihlášení
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/user', require('./routes/user'));

// ==================================
//  GEMINI CHAT API
// ==================================

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.warn("⚠️  Chybí GOOGLE_API_KEY v .env — /api/chat nebude fungovat.");
}

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/level", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "level.html"));
});

// Main app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function toGeminiContents(openAiMessages) {
  return openAiMessages.map(m => {
    const parts = [];
    
    // Handle content as array (multiple parts like images + text)
    const contentArray = Array.isArray(m.content) ? m.content : [m.content];
    
    contentArray.forEach(content => {
      // If content is a base64 image string (starts with data:image)
      if (typeof content === "string" && content.startsWith("data:image")) {
        const [mimeInfo, base64Data] = content.split(",");
        const mimeType = mimeInfo.match(/:(.*?);/)[1];
        
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        });
      } else if (typeof content === "string") {
        // Regular text content
        parts.push({ text: content });
      } else if (typeof content === "object" && content !== null) {
        // Already formatted part (e.g., {type: 'text', text: '...'} or {type: 'image_url', ...})
        if (content.type === "text" && content.text) {
          parts.push({ text: content.text });
        } else if (content.type === "image_url" && content.image_url?.url) {
          const url = content.image_url.url;
          if (url.startsWith("data:image")) {
            const [mimeInfo, base64Data] = url.split(",");
            const mimeType = mimeInfo.match(/:(.*?);/)[1];
            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            });
          }
        }
      }
    });

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: parts.length > 0 ? parts : [{ text: "" }]
    };
  });
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

  if (data?.candidates?.[0]?.content?.parts) {
    const text = data.candidates[0].content.parts.map(p => p.text || "").join("");
    if (text.trim()) return text; // Pokud máme text, vrátíme ho
}
  
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

// API endpoint pro chat
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

const PORT = process.env.PORT || 5000; // Změníme port na 5000, aby se to nebilo s jinými aplikacemi
app.listen(PORT, () => {
  console.log(`✅ Server běží na http://localhost:${PORT}`);
});
