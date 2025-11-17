// ─────────────────────────────────────────────────
// 1. Utilities
// ─────────────────────────────────────────────────
const util = {
  genId: () => Math.random().toString(36).slice(2, 10),
  
  escapeHtml: (str) => str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;"),
  
  // Simple Markdown to HTML converter
  markdownToHtml: (md) => {
    if (!md) return "";
    
    let html = util.escapeHtml(md);
    
    // Bold: **text** → <strong>text</strong>
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    
    // Italic: *text* → <em>text</em>
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    
    // Code: `text` → <code>text</code>
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");
    
    // Line breaks: \n → <br>
    html = html.replace(/\n/g, "<br>");
    
    // Unordered lists: * item → <li>item</li> (wrapped in <ul>)
    html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
    
    // Headings: # Heading → <h2>Heading</h2>
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
    
    return html;
  },
  
  autoResize: (el) => {
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }
};

// ─────────────────────────────────────────────────
// 2. DOM references (cache once)
// ─────────────────────────────────────────────────
const DOM = {
  // Tabs
  tabs: null,
  contents: null,

  // Chat UI
  messages: null,
  input: null,
  sendBtn: null,
  threadListEl: null,
  newThreadBtn: null,
  chatTitleEl: null,

  // File upload
  upload: null,
  fileList: null,

  // Flashcard
  flashcard: null,

  init() {
    // Tabs
    this.tabs = document.querySelectorAll(".tab-btn");
    this.contents = document.querySelectorAll(".tab-content");

    // Chat
    this.messages = document.getElementById("messages");
    this.input = document.getElementById("chatInput");
    this.sendBtn = document.getElementById("sendBtn");
    this.threadListEl = document.getElementById("threadList");
    this.newThreadBtn = document.getElementById("newThreadBtn");
    this.chatTitleEl = document.getElementById("chatTitle");
    this.plusBtn = document.getElementById("chatPlusBtn");
    this.actionMenu = document.getElementById("actionMenu");

    // File upload
    this.upload = document.getElementById("fileUpload");
    this.fileList = document.getElementById("fileList");

    // Flashcard
    this.flashcard = document.getElementById("flashcard");

    // Validate essential chat elements
    if (!this.messages || !this.input || !this.sendBtn || !this.threadListEl || !this.newThreadBtn || !this.chatTitleEl || !this.plusBtn || !this.actionMenu) {
      console.warn("Chat UI elements not found – check IDs in index.html");
      return false;
    }
    return true;
  }
};

// ─────────────────────────────────────────────────
// 3. Chat state & storage
// ─────────────────────────────────────────────────
const chatState = {
  chats: [],
  currentChatId: null,

  init() {
    this.chats = JSON.parse(localStorage.getItem("quizmate_chats") || "[]");
    if (this.chats.length === 0) {
      this.chats = [
        { id: util.genId(), name: "Vektory", messages: [] },
        { id: util.genId(), name: "Lineární rovnice", messages: [] }
      ];
      this.save();
    }
    this.currentChatId = localStorage.getItem("quizmate_current_chat") || this.chats[0].id;
    localStorage.setItem("quizmate_current_chat", this.currentChatId);
  },

  save() {
    localStorage.setItem("quizmate_chats", JSON.stringify(this.chats));
  },

  getCurrent() {
    return this.chats.find(c => c.id === this.currentChatId);
  },

  selectChat(id) {
    this.currentChatId = id;
    localStorage.setItem("quizmate_current_chat", id);
    ui.renderThreads();
    ui.renderMessages();
    DOM.chatTitleEl.textContent = this.getCurrent().name;
  },

  addChat(name) {
    const newChat = { id: util.genId(), name, messages: [] };
    this.chats.unshift(newChat);
    this.save();
    return newChat;
  },

  addMessageToChat(text, role) {
    const chat = this.getCurrent();
    chat.messages.push({
      id: util.genId(),
      role,
      content: text,
      timestamp: new Date().toISOString()
    });
    this.save();
  }
};

// ─────────────────────────────────────────────────
// 4. UI Rendering
// ─────────────────────────────────────────────────
const ui = {
  renderThreads() {
    DOM.threadListEl.innerHTML = "";
    chatState.chats.forEach(chat => {
      const li = document.createElement("li");
      li.className = "thread-item" + (chat.id === chatState.currentChatId ? " active" : "");

      //název chatu
      const nameSpan = document.createElement("span");
      nameSpan.className = "thread-name";
      nameSpan.textContent = chat.name;

      //koš
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-thread-btn";
      deleteBtn.textContent = "🗑️";
      deleteBtn.dataset.chatId = chat.id;

      //klik na chat
      li.addEventListener("click", () => chatState.selectChat(chat.id));

      //klik na koš
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();              //zabráníme výběru chatu

        const id = deleteBtn.dataset.chatId;

        //smazaní chatu
        chatState.chats = chatState.chats.filter(c => c.id !== id);
        chatState.save();

        //pokud byl smazaný aktuální chat, přepneme na jiný
        if (chatState.currentChatId === id) {
          if (chatState.chats.length > 0) {
            chatState.currentChatId = chatState.chats[0].id;
          } else {
            chatState.currentChatId = null;
          }
        }

        ui.renderThreads();
        ui.renderMessages();
      });

      li.appendChild(nameSpan);
      li.appendChild(deleteBtn);

      
      DOM.threadListEl.appendChild(li);
    });
  },

  renderNotes() {

    const chat = chatState.getCurrent();
    const notes = chat.notes || [];
    const notesContainer = document.getElementById("notesContainer");
    notesContainer.innerHTML = "";
    if (notes.length === 0) {
      notesContainer.innerHTML = "<p>Žádné poznámky k zobrazení.</p>";
      return;
    }
    notes.forEach(note => {
      const div = document.createElement("div");
      div.className = "note-item";
      div.innerHTML = util.markdownToHtml(note.content);
      notesContainer.appendChild(div);
    });
  },

  renderMessages() {
    DOM.messages.innerHTML = "";
    chatState.getCurrent().messages.forEach(m => {
      this.createMessageElement(m.content, m.role);
    });
    DOM.messages.scrollTop = DOM.messages.scrollHeight;
  },

  createMessageElement(text, role) {
    const row = document.createElement("div");
    row.className = `msg ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "U" : "Q";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    // Use Markdown parser for AI responses, plain text for user
    bubble.innerHTML = role === "assistant" ? util.markdownToHtml(text) : util.escapeHtml(text);

    row.appendChild(avatar);
    row.appendChild(bubble);
    DOM.messages.appendChild(row);
    DOM.messages.scrollTop = DOM.messages.scrollHeight;

    // Re-render math (KaTeX) after adding message
    if (window.renderMathInElement && role === "assistant") {
      setTimeout(() => {
        renderMathInElement(bubble, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
          ]
        });
      }, 0);
    }
  },

  addMessage(text, role) {
    this.createMessageElement(text, role);
    chatState.addMessageToChat(text, role);
  }
};

// ─────────────────────────────────────────────────
// 5. API calls
// ─────────────────────────────────────────────────
const api = {
  // Limit to last N messages to save tokens
  MAX_CONTEXT_MESSAGES: 10,

  getContextMessages() {
    const chat = chatState.getCurrent();
    const allMessages = chat.messages;
    // Send only the last MAX_CONTEXT_MESSAGES to save tokens
    return allMessages.slice(-this.MAX_CONTEXT_MESSAGES);
  },

  async askAI(messages) {
    // Build a helpful system message using the current chat's topic
    const currentName = (chatState.getCurrent && chatState.getCurrent()?.name) || "(téma)";
    const systemMessage = {
      role: "system",
      content: `Odpovídej vždy výhradně česky. Nikdy nepoužívej jiný jazyk. ` +
               `Jsi asistent, který pomáhá studentovi v tématu: "${currentName}". ` +
               `Drž konverzaci v kontextu tohoto tématu a v případě nejasností se ptej.`
    };

    const payload = {
      messages: [systemMessage, ...messages.map(m => ({ role: m.role, content: m.content }))]
    };

    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      // Try to parse JSON error body, fall back to text
      let bodyText = await resp.text().catch(() => "");
      try {
        const json = JSON.parse(bodyText || "{}");
        const errMsg = json.error || json.message || bodyText;
        throw new Error(`API error ${resp.status}: ${errMsg}`);
      } catch (parseErr) {
        throw new Error(`API error ${resp.status}: ${bodyText}`);
      }
    }

    const data = await resp.json();
    return data.reply;
  }
};

// ─────────────────────────────────────────────────
// 6. Event handlers
// ─────────────────────────────────────────────────

const events = {
  initTabs() {
    DOM.tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        DOM.tabs.forEach(b => b.classList.remove("active"));
        DOM.contents.forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
      });
    });
  },

  initChat() {
    // New thread
    DOM.newThreadBtn.addEventListener("click", () => {
      const name = prompt("Name of the chat/topic:");
      if (!name) return;
      const newChat = chatState.addChat(name);
      chatState.selectChat(newChat.id);
    });

    // Send message
    DOM.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    DOM.sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    DOM.plusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      DOM.actionMenu.classList.toggle("hidden");
    });

    // Prevent clicks inside the menu from closing it immediately
    DOM.actionMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  
    //kliknutí mimo menu zavře menu
    document.addEventListener("click", () => {
      DOM.actionMenu.classList.add("hidden");
    });

    // klik na akci v menu
    DOM.actionMenu.addEventListener("click", (e) => {
      const action = e.target.dataset.action;
      if (!action) return;

      if (action === "notes") {
        events.generateNotes();
      } else if (action === "flashcards") {
        events.generateFlashcards();
      } else if (action === "files") {
        DOM.upload.click();
      }

      DOM.actionMenu.classList.add("hidden");
    });

    // Auto-resize textarea
    DOM.input.addEventListener("input", () => util.autoResize(DOM.input));
  },

  async sendMessage() {
    const text = DOM.input.value.trim();
    if (!text) return;

    ui.addMessage(text, "user");
    DOM.input.value = "";
    util.autoResize(DOM.input);

    try {
      // Send only recent messages to save tokens
      const recentMessages = api.getContextMessages();
      const reply = await api.askAI(recentMessages);
      ui.addMessage(reply, "assistant");
    } catch (e) {
      console.error(e);
      // Show the actual error message returned from the server when possible
      const msg = e && e.message ? `⚠️ ${e.message}` : "⚠️ Nepodařilo se získat odpověď od AI.";
      ui.addMessage(msg, "assistant");
    }
  },

  initFileUpload() {
    if (!DOM.upload || !DOM.fileList) return;

    DOM.upload.addEventListener("change", () => {
      DOM.fileList.innerHTML = "";
      Array.from(DOM.upload.files).forEach(file => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
        DOM.fileList.appendChild(div);
      });
    });
  },

  initFlashcard() {
    if (!DOM.flashcard) return;
    DOM.flashcard.addEventListener("click", () => {
      DOM.flashcard.classList.toggle("flipped");
    });
  },

  
};

// ─────────────────────────────────────────────────
// 7. App initialization
// ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (!DOM.init()) return; // Abort if DOM elements missing

  chatState.init();
  events.initTabs();
  events.initChat();
  events.initFileUpload();
  events.initFlashcard();

  chatState.selectChat(chatState.currentChatId);
});