import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

app.arguments(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.arguments(express.static(__dirname));

if (!process.env.OPENAI_API_KEY) {         // kontrola, že máme klíč
   console.error("Chybí OPENAI_API_KEY v .env");
   process.exit(1);
}

async function callOpenAI(messages) {      // volání OpenAI Chat Completions
   const resp = await fetch("https://api.openai.com/v1/chat/completions", {
     method: "POST",
     headers: {
       "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
       "Content-Type": "application/json"
     },
     body: JSON.stringify({
       model: "gpt-5",
       temperature: 1,                     // „kreativita“
       messages                               // [{role, content}, ...] včetně historie
     })
   });

   if (!resp.ok) {                           // ošetření chyb API
     const err = await resp.text();
     throw new Error(`OpenAI error ${resp.status}: ${err}`);
   }

    const data = await resp.json();           // JSON → objekt
   return data.choices[0].message.content;   // vrátíme text odpovědi
}

app.post("/api/chat", async (req, res) => { // endpoint pro frontend
   try {
     const { messages } = req.body;          // očekáváme { messages: [...] }
     if (!Array.isArray(messages) || messages.length === 0) {
       return res.status(400).json({ error: "messages musí být neprázdné pole" });
     }
     const reply = await callOpenAI(messages);
     res.json({ reply });                     // pošleme { reply: "..." }
   } catch (e) {
     console.error(e);
     res.status(500).json({ error: "Server: " + e.message });
   }
});

const PORT = 3000;                          // na tomhle portu poběžíme
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});