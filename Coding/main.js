/****************************************************
 * 1 UTILITIES
 ****************************************************/
const util = {
  genId: () => Math.random().toString(36).slice(2, 10),

  escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  // Markdown → HTML (math-safe)
  markdownToHtml(md) {
    if (!md) return "";

    const placeholders = [];
    let html = md;

    // Protect display math
    html = html.replace(/\$\$(.+?)\$\$/gs, (m) => {
      const key = `__MATH_BLOCK_${placeholders.length}__`;
      placeholders.push(m);
      return key;
    });

    // Protect inline math
    html = html.replace(/\$(.+?)\$/g, (m) => {
      const key = `__MATH_INLINE_${placeholders.length}__`;
      placeholders.push(m);
      return key;
    });

    html = util.escapeHtml(html);

    placeholders.forEach((m, i) => {
      html = html.replaceAll(`__MATH_BLOCK_${i}__`, m);
      html = html.replaceAll(`__MATH_INLINE_${i}__`, m);
    });

    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");
    html = html.replace(/\n/g, "<br>");

    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    return html;
  },

  autoResize(el) {
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }
};


/****************************************************
 * 2. DOM
 ****************************************************/
const DOM = {
  init() {
    this.tabs = document.querySelectorAll(".tab-btn");
    this.contents = document.querySelectorAll(".tab-content");

    this.messages = document.getElementById("messages");
    this.input = document.getElementById("chatInput");
    this.sendBtn = document.getElementById("sendBtn");
    this.threadListEl = document.getElementById("threadList");
    this.newThreadBtn = document.getElementById("newThreadBtn");
    this.chatTitleEl = document.getElementById("chatTitle");

    this.plusBtn = document.getElementById("chatPlusBtn");
    this.actionMenu = document.getElementById("actionMenu");

    this.upload = document.getElementById("fileUpload");
    this.fileList = document.getElementById("fileList");

    this.notesGrid = document.getElementById("notesTopics");
    this.noteDetail = document.getElementById("noteDetail");
    this.noteDetailTitle = document.getElementById("noteDetailTitle");
    this.noteDetailContent = document.getElementById("noteDetailContent");
    this.backToNotes = document.getElementById("backToNotes");

    this.flashcard = document.getElementById("flashcard");
    this.flashNav = document.getElementById("flashNav");
    this.flashFront = document.getElementById("flashFront");
    this.flashBack = document.getElementById("flashBack");
    this.flashIndex = document.getElementById("flashIndex");
    this.prevFlash = document.getElementById("prevFlash");
    this.nextFlash = document.getElementById("nextFlash");

    return true;
  }
};


/****************************************************
 * 3. NOTES STORE
 ****************************************************/
const notesStore = {}; // topic → { title, content }


/****************************************************
 * 4. CHAT STATE
 ****************************************************/
const chatState = {
  chats: [],
  currentChatId: null,

  init() {
    this.chats = JSON.parse(localStorage.getItem("quizmate_chats") || "[]");

    if (this.chats.length === 0) {
      this.chats = [
        { id: util.genId(), name: "Trigonometry", messages: [] },
        { id: util.genId(), name: "Linear equations", messages: [] }
      ];
      this.save();
    }

    this.currentChatId =
      localStorage.getItem("quizmate_current_chat") || this.chats[0].id;

    localStorage.setItem("quizmate_current_chat", this.currentChatId);
  },

  save() {
    localStorage.setItem("quizmate_chats", JSON.stringify(this.chats));
  },

  getCurrent() {
    return this.chats.find((c) => c.id === this.currentChatId);
  },

  selectChat(id) {
    this.currentChatId = id;
    localStorage.setItem("quizmate_current_chat", id);
    ui.renderThreads();
    ui.renderMessages();
    DOM.chatTitleEl.textContent = this.getCurrent().name;
  },

  addChat(name) {
    const chat = { id: util.genId(), name, messages: [] };
    this.chats.unshift(chat);
    this.save();
    return chat;
  },

  addMessage(text, role) {
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


/****************************************************
 * 5. UI
 ****************************************************/
const ui = {
  /* THREADS */
  renderThreads() {
    DOM.threadListEl.innerHTML = "";

    chatState.chats.forEach((chat) => {
      const li = document.createElement("li");
      li.className =
        "thread-item" + (chat.id === chatState.currentChatId ? " active" : "");

      const name = document.createElement("span");
      name.textContent = chat.name;

      const del = document.createElement("button");
      del.textContent = "🗑️";
      del.className = "delete-thread-btn";

      del.addEventListener("click", (e) => {
        e.stopPropagation();
        chatState.chats = chatState.chats.filter((c) => c.id !== chat.id);
        chatState.save();

        if (chatState.currentChatId === chat.id) {
          chatState.currentChatId = chatState.chats[0]?.id || null;
        }

        ui.renderThreads();
        ui.renderMessages();
      });

      li.appendChild(name);
      li.appendChild(del);

      li.addEventListener("click", () => chatState.selectChat(chat.id));
      DOM.threadListEl.appendChild(li);
    });
  },

  /* MESSAGES */
  createMessageElement(msg) {
    const row = document.createElement("div");
    row.className = "msg " + msg.role;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = msg.role === "user" ? "U" : "AI";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (msg.role === "assistant") bubble.innerHTML = util.markdownToHtml(msg.content);
    else bubble.textContent = msg.content;

    row.appendChild(avatar);
    row.appendChild(bubble);

    return row;
  },

  renderMessages() {
    DOM.messages.innerHTML = "";
    const chat = chatState.getCurrent();
    if (!chat) return;

    chat.messages.forEach((m) => {
      DOM.messages.appendChild(ui.createMessageElement(m));
    });

    DOM.messages.scrollTop = DOM.messages.scrollHeight;
  },

  addMessage(text, role) {
    chatState.addMessage(text, role);
    ui.renderMessages();
  },

  /* NOTES */
  renderNotesGrid() {
    DOM.noteDetail.classList.add("hidden");
    DOM.backToNotes.classList.add("hidden");
    DOM.notesGrid.innerHTML = "";

    const topics = Object.keys(notesStore);

    topics.forEach((topic) => {
      const card = document.createElement("div");
      card.className = "topic-card";
      card.textContent = topic;

      card.addEventListener("click", () => ui.openNoteDetail(topic));
      DOM.notesGrid.appendChild(card);
    });
  },

  openNoteDetail(topic) {
    const data = notesStore[topic];
    if (!data) return;

    DOM.noteDetailTitle.textContent = data.title;
    DOM.noteDetailContent.innerHTML = util.markdownToHtml(data.content);

    DOM.backToNotes.classList.remove("hidden");
    DOM.noteDetail.classList.remove("hidden");
    DOM.notesGrid.innerHTML = "";

    if (window.renderMathInElement) {
      renderMathInElement(DOM.noteDetailContent, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
  }
};


/****************************************************
 * FLASHCARDS
 ****************************************************/
const flashcards = {
  cards: [],
  index: 0,

  render() {
    if (this.cards.length === 0) {
      DOM.flashcard.classList.add("hidden");
      DOM.flashNav.classList.add("hidden");
      return;
    }

    DOM.flashcard.classList.remove("hidden");
    DOM.flashNav.classList.remove("hidden");

    const card = this.cards[this.index];

    DOM.flashFront.innerHTML = util.markdownToHtml(card.q);
    DOM.flashBack.innerHTML = util.markdownToHtml(card.a);

    DOM.flashIndex.textContent = `${this.index + 1} / ${this.cards.length}`;
  },

  next() {
    if (this.index < this.cards.length - 1) this.index++;
    this.render();
  },

  prev() {
    if (this.index > 0) this.index--;
    this.render();
  }
};


/****************************************************
 * 7. API
 ****************************************************/
const api = {
  MAX_CONTEXT: 10,

  getContextMessages() {
    const chat = chatState.getCurrent();
    return chat.messages.slice(-this.MAX_CONTEXT);
  },

  async askAI(messages) {
    const topic = chatState.getCurrent()?.name || "(téma)";

    const system = {
      role: "user",
      content: `Odpovídej česky. Téma chatu: ${topic}.`
    };

    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [system, ...messages] })
    });

    const data = await resp.json();
    return data.reply;
  }
};


/****************************************************
 * 8. EVENTS
 ****************************************************/
const events = {
  initTabs() {
    DOM.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        DOM.tabs.forEach((b) => b.classList.remove("active"));
        DOM.contents.forEach((c) => c.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");

        if (btn.dataset.tab === "notes") ui.renderNotesGrid();
      });
    });
  },

  initChat() {
    DOM.newThreadBtn.addEventListener("click", () => {
      const name = prompt("Název nového chatu:");
      if (!name) return;

      const chat = chatState.addChat(name);
      chatState.selectChat(chat.id);
    });

    DOM.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        events.sendMessage();
      }
    });

    DOM.sendBtn.addEventListener("click", events.sendMessage);

    DOM.plusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      DOM.actionMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
      DOM.actionMenu.classList.add("hidden");
    });

    // ACTION MENU
    DOM.actionMenu.addEventListener("click", (e) => {
      const act = e.target.dataset.action;
      if (!act) return;

      if (act === "notes") events.generateNotes();
      if (act === "flashcards") events.generateFlashcards();
      if (act === "files") DOM.upload.click();
    });

    document.addEventListener('DOMContentLoaded', () => {
      // Select the avatar, which now has the toggle ID
      const toggleButton = document.getElementById('toggleSidebar'); 
      const sidebar = document.querySelector('.sidebar');
      
      if (toggleButton && sidebar) {
          toggleButton.addEventListener('click', () => {
              sidebar.classList.toggle('collapsed');
          });
      }
    });
  },

  async sendMessage() {
    const text = DOM.input.value.trim();
    if (!text) return;

    ui.addMessage(text, "user");

    DOM.input.value = "";
    util.autoResize(DOM.input);

    try {
      const ctx = api.getContextMessages();
      const reply = await api.askAI(ctx);
      ui.addMessage(reply, "assistant");
    } catch (err) {
      ui.addMessage("⚠️ Chyba serveru: " + err.message, "assistant");
    }
  },

  initFileUpload() {
    DOM.upload.addEventListener("change", () => {
      DOM.fileList.innerHTML = "";

      [...DOM.upload.files].forEach((f) => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
        DOM.fileList.appendChild(div);
      });
    });
  },

  /* GENERATE NOTES */
  async generateNotes() {
    const chat = chatState.getCurrent();
    const topic = chat.name;

    ui.addMessage("📝 Generuji výpisky...", "assistant");

    const ctx = api.getContextMessages();

    const prompt = `
      Vytvoř přehledné, strukturované a vysokoškolsky kvalitní výpisky k tématu **${topic}**.
      Použij nadpisy, odrážky, vysvětlení, vzorce (KaTeX), příklady.
      `;

    const reply = await api.askAI([{ role: "user", content: prompt }]);

    notesStore[topic] = {
      title: topic,
      content: reply
    };

    document.querySelector('[data-tab="notes"]').click();
    ui.renderNotesGrid();
  },

  /* GENERATE FLASHCARDS */
  async generateFlashcards() {
    const chat = chatState.getCurrent();
    const topic = chat.name;

    ui.addMessage("🧠 Generuji flashcards...", "assistant");

    const prompt = `
      Vytvoř 8 jednoduchých flashcards pro téma "${topic}" ve formátu:
      Q: otázka
      A: odpověď
      Každou dvojici odděl prázdným řádkem.
      `;

    const reply = await api.askAI([{ role: "user", content: prompt }]);

    const cards = reply
      .split("\n\n")
      .map((pair) => {
        const q = pair.match(/Q:\s*(.+)/i)?.[1];
        const a = pair.match(/A:\s*(.+)/i)?.[1];
        if (!q || !a) return null;
        return { q, a };
      })
      .filter(Boolean);

    flashcards.cards = cards;
    flashcards.index = 0;
    flashcards.render();

    document.querySelector('[data-tab="flashcards"]').click();
  },


  initFlashcards() {
    // Flashcard events
    DOM.flashcard.addEventListener("click", () => {
      DOM.flashcard.classList.toggle("flipped");
    });

    DOM.nextFlash.addEventListener("click", () => flashcards.next());
    DOM.prevFlash.addEventListener("click", () => flashcards.prev());
  }
};


/****************************************************
 * 9. INIT
 ****************************************************/
document.addEventListener("DOMContentLoaded", () => {
  DOM.init();
  chatState.init();

  events.initTabs();
  events.initChat();
  events.initFlashcards();
  events.initFileUpload();

  ui.renderThreads();
  ui.renderMessages();

  // Flashcard events
  DOM.flashcard.addEventListener("click", () => {
    DOM.flashcard.classList.toggle("flipped");
  });

  DOM.nextFlash.addEventListener("click", () => flashcards.next());
  DOM.prevFlash.addEventListener("click", () => flashcards.prev());

  // Back button for notes
  DOM.backToNotes.addEventListener("click", () => {
    ui.renderNotesGrid();
  });
});
