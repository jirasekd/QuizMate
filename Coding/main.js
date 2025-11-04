
// Přepínání tabů
document.addEventListener("DOMContentLoaded", () => {
  // Tabs switching
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  
  // CHAT
  const messages = document.getElementById("messages");
  const input    = document.getElementById("chatInput");
  const sendBtn  = document.getElementById("sendBtn");
  const threadListEl = document.getElementById("threadList");
  const newThreadBtn = document.getElementById("newThreadBtn");
  const chatTitleEl  = document.getElementById("chatTitle");

  if (!messages || !input || !sendBtn || !threadListEl || !newThreadBtn || !chatTitleEl) {
    console.warn("Chat UI elements not found – check IDs in index.html");
    return;
  }

  
  // Vlákna (chaty) – data + perzistence
  let chats = JSON.parse(localStorage.getItem("quizmate_chats") || "[]");
  if (chats.length === 0) {
    chats = [
      { id: genId(), name: "Trigonometry", messages: [] },
      { id: genId(), name: "Algebra", messages: [] },
      { id: genId(), name: "Calculus", messages: [] }
    ];
    saveChats();
  }

  let currentChatId = localStorage.getItem("quizmate_current_chat") || chats[0].id;
  localStorage.setItem("quizmate_current_chat", currentChatId);

  function saveChats() {
    localStorage.setItem("quizmate_chats", JSON.stringify(chats));
  }

  function genId() {
    // jednoduché náhodné ID
    return Math.random().toString(36).slice(2, 10);
  }

  function getCurrentChat() {
    return chats.find(c => c.id === currentChatId);
  }

  function selectChat(id) {
    currentChatId = id;
    localStorage.setItem("quizmate_current_chat", currentChatId);
    renderThreads();
    renderMessages();
    chatTitleEl.textContent = getCurrentChat().name;
  }

  function renderThreads() {
    threadListEl.innerHTML = "";
    chats.forEach(chat => {
      const li = document.createElement("li");
      li.className = "thread-item" + (chat.id === currentChatId ? " active" : "");
      li.textContent = chat.name;
      li.addEventListener("click", () => selectChat(chat.id));
      threadListEl.appendChild(li);
    });
  }

  newThreadBtn.addEventListener("click", () => {
    const name = prompt("Name of the chat/topic:");
    if (!name) return;
    const newChat = { id: genId(), name, messages: [] };
    chats.unshift(newChat);
    saveChats();
    selectChat(newChat.id);
  });


  // Moderní render zprávy (bubliny + avatar)
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function addMessage(text, role) {
    //UI rendering
    const row = document.createElement("div");
    row.className = `msg ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "U" : "Q";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = escapeHtml(text);

    row.appendChild(avatar);
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;

    //Uložení do dat aktuálního vlákna
    const chat = getCurrentChat();
    chat.messages.push({
      id: genId(),
      role,
      content: text,
      timestamp: new Date().toISOString()
    });
    saveChats();
  }

  function renderMessages() {
    messages.innerHTML = "";
    const chat = getCurrentChat();
    chat.messages.forEach(m => {
      const row = document.createElement("div");
      row.className = `msg ${m.role}`;

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = m.role === "user" ? "U" : "Q";

      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = escapeHtml(m.content);

      row.appendChild(avatar);
      row.appendChild(bubble);
      messages.appendChild(row);
    });
    messages.scrollTop = messages.scrollHeight;
  }

  // Odesílání zprávy + jednoduché „výpisky k …“
  sendBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";
    autoResize(input);

    // detekce požadavku na výpisky
    if (text.toLowerCase().includes("vypis") || text.toLowerCase().includes("výpisk")) {
      setTimeout(() => {
        // regex: odstraní „(napiš|udělej|vytvoř)? výpisky k “ a nechá jen téma
        const topic = text.replace(/(napiš|udělej|vytvoř)?\s*výpisky\s*k\s*/i, "").trim() || "Zadané téma";

        // simulace výpisků – později se sem napojí AI (OpenAI/Gemini)
        const notes = [
          `📘 Téma: ${topic}`,
          `🔹 Základní přehled: ${topic} – hlavní principy a použití.`,
          `🔹 Klíčové body:`,
          `- Definice ${topic}`,
          `- Důležité příklady`,
          `- Shrnutí významu`
        ].join("\n");

        addMessage(notes, "assistant");

        // uložit výpisky bokem (per chat id)
        const stored = JSON.parse(localStorage.getItem("quizmate_notes") || "[]");
        stored.push({ topic, content: notes, createdAt: new Date().toISOString(), chatId: currentChatId });
        localStorage.setItem("quizmate_notes", JSON.stringify(stored));
      }, 500);
    } else {
      setTimeout(() => {
        addMessage("OK. Chceš k tomu rovnou výpisky? Napiš: „výpisky k ...“", "assistant");
      }, 400);
    }
  });

  // Enter = odeslat (s Shift = nový řádek)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // Auto-resize textarea
  function autoResize(el) {
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }
  input.addEventListener("input", () => autoResize(input));
  setTimeout(() => autoResize(input), 0);

  
  // Inicializace
  renderThreads();
  selectChat(currentChatId);

  
  // FILE UPLOAD 
  const upload = document.getElementById("fileUpload");
  const fileList = document.getElementById("fileList");

  if (upload && fileList) {
    upload.addEventListener("change", () => {
      fileList.innerHTML = "";
      Array.from(upload.files).forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
        fileList.appendChild(div);
      });
    });
  }

  
  // FLASHCARD flip
  const flashcard = document.getElementById("flashcard");
  if (flashcard) {
    flashcard.addEventListener("click", () => {
      flashcard.classList.toggle("flipped");
    });
  }
});


  const systemPrompt = {
    role: "system",
    content: "Jsi QuizMate, přátelský učitel. Odpovídej česky, stručně a krokově."
  };

  const conversation = [systemPrompt];                 // držíme historii pro kontext

  const form = document.querySelector("#chat-form");   // formulář
  const input = document.querySelector("#chat-input"); // input
  const list  = document.querySelector("#chat-list");  // kontejner bublin

  function addBubble(role, text) {                     // renderer bublin
    const div = document.createElement("div");
    div.className = `msg ${role}`;                     // očekává .msg.user / .msg.assistant
    div.textContent = text;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  function setTyping(visible) {                        // „asistent píše…“
    let el = document.querySelector(".typing");
    if (visible && !el) {
      el = document.createElement("div");
      el.className = "msg assistant typing";
      el.textContent = "…";
      list.appendChild(el);
    }
    if (!visible && el) el.remove();
    list.scrollTop = list.scrollHeight;
  }

  async function sendToServer(messages) {              // volání našeho backendu
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    if (!res.ok) {                                      // HTTP chyba (např. 401/500)
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();                      // { reply: "..." }
    return data.reply;
  }

  form.addEventListener("submit", async (e) => {        // odeslání zprávy
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addBubble("user", text);                            // 1) zobraz hned uživatele
    input.value = "";

    conversation.push({ role: "user", content: text }); // 2) ulož do historie

    try {
      setTyping(true);                                  // 3) animace psaní
      const reply = await sendToServer(conversation);   // 4) zavolej backend
      setTyping(false);

      addBubble("assistant", reply);                    // 5) zobraz odpověď
      conversation.push({ role: "assistant", content: reply }); // 6) ulož odpověď
    } catch (err) {
      setTyping(false);
      console.error(err);
      addBubble("assistant", "😕 Něco se pokazilo. Zkus to znovu.");
    }
  });
