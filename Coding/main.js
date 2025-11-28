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
    html = html.replace(/(\$\$[\s\S]+?\$\$)/g, (m) => {
      const key = `__MATH_BLOCK_${placeholders.length}__`;
      placeholders.push(m);
      return key;
    });

    // Protect inline math
    html = html.replace(/(\$[\s\S]+?\$)/g, (m) => {
      const key = `__MATH_INLINE_${placeholders.length}__`;
      placeholders.push(m);
      return key;
    });

    // Now, process the non-math content
    html = util.escapeHtml(html);

    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Finally, restore the math blocks and handle newlines for non-math text
    placeholders.forEach((m, i) => {
      html = html.replace(`__MATH_BLOCK_${i}__`, m);
      html = html.replace(`__MATH_INLINE_${i}__`, m);
    });

    html = html.replace(/\n/g, "<br>");

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
    this.hamburgerBtn = document.getElementById("hamburgerBtn");
    this.resetAppBtn = document.getElementById("resetAppBtn");

    this.plusBtn = document.getElementById("chatPlusBtn");
    this.actionMenu = document.getElementById("actionMenu");

    this.upload = document.getElementById("fileUpload");
    this.fileList = document.getElementById("fileList");

    this.notesGrid = document.getElementById("notesTopics");
    this.noteDetail = document.getElementById("noteDetail");
    this.noteDetailTitle = document.getElementById("noteDetailTitle");
    this.noteDetailContent = document.getElementById("noteDetailContent");
    this.backToNotes = document.getElementById("backToNotes");
    this.backToDecks = document.getElementById("backToDecks");

    this.flashcard = document.getElementById("flashcard");
    this.flashNav = document.getElementById("flashNav");
    this.flashFront = document.getElementById("flashFront");
    this.flashBack = document.getElementById("flashBack");
    this.flashIndex = document.getElementById("flashIndex");
    this.prevFlash = document.getElementById("prevFlash");
    this.nextFlash = document.getElementById("nextFlash");
    this.flashcardDecks = document.getElementById("flashcardDecks");

    return true;
  }
};


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
        { id: util.genId(), name: "Pythagorova věta", messages: [], notes: null, flashcards: null, tests: null },
        { id: util.genId(), name: "Lineární rovnice", messages: [], notes: null, flashcards: null, tests: null }
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
    const chat = { id: util.genId(), name, messages: [], notes: null, flashcards: null, tests: null };
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
  },

  addFlashcards(cards) {
    const chat = this.getCurrent();
    if (!chat) return;
    if (!chat.flashcards) { // Ensure the array exists before adding to it
      chat.flashcards = [];
    }
    // Replace existing flashcards for this chat
    chat.flashcards = cards;
    this.save();
  },

  addNotes(content) {
    const chat = this.getCurrent();
    if (!chat) return;
    chat.notes = {
      title: chat.name,
      content: content
    };
    this.save();
  },

  addTest(testData) {
    const chat = this.getCurrent();
    if (!chat) return;
    if (!chat.tests) { // Ensure the array exists before adding to it
      chat.tests = [];
    }
    chat.tests.push(testData); // Or replace, depending on desired logic
    this.save();
  }
};


/****************************************************
 * 5. UI
 ****************************************************/
const ui = {
  /**
   * Renders KaTeX math expressions within a given DOM element.
   * @param {HTMLElement} element The element to scan for math.
   */
  renderMathInElement(element) {
    if (window.renderMathInElement) {
      renderMathInElement(element, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ]
      });
    }
  },
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

    // After setting innerHTML, render math inside the bubble
    this.renderMathInElement(bubble);

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

    // Find chats that have notes
    const chatsWithNotes = chatState.chats.filter(
      (chat) => chat.notes && chat.notes.content
    );

    chatsWithNotes.forEach((chat) => {
      const card = document.createElement("div");
      card.className = "topic-card";
      card.innerHTML = `
        <div class="topic-title">📝 ${chat.name}</div>
        <div class="topic-preview">${chat.notes.content.substring(0, 60)}...</div>
        <button class="delete-item-btn">🗑️</button>
      `;

      card.querySelector('.delete-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Opravdu chcete smazat výpisky pro "${chat.name}"?`)) {
          chat.notes = null;
          chatState.save();
          ui.renderNotesGrid();
        }
      });

      // Add click listener to the card itself, excluding the button
      card.addEventListener("click", (e) => { if (e.target.tagName !== 'BUTTON') ui.openNoteDetail(chat.id) });
      DOM.notesGrid.appendChild(card);
    });
  },

  openNoteDetail(chatId) {
    const chat = chatState.chats.find((c) => c.id === chatId);
    if (!chat || !chat.notes) return;

    DOM.noteDetailTitle.textContent = chat.notes.title;
    DOM.noteDetailContent.innerHTML = util.markdownToHtml(chat.notes.content);

    DOM.backToNotes.classList.remove("hidden");
    DOM.noteDetail.classList.remove("hidden");

    this.renderMathInElement(DOM.noteDetailContent);
  },

  /* FLASHCARDS */
  renderDeckGrid() {
    DOM.flashcard.classList.add("hidden");
    DOM.flashNav.classList.add("hidden");
    DOM.backToDecks.classList.add("hidden");
    DOM.flashcardDecks.classList.remove("hidden");
    DOM.flashcardDecks.innerHTML = "";

    // Find chats that have flashcards
    const chatsWithDecks = chatState.chats.filter(
      (chat) => Array.isArray(chat.flashcards) && chat.flashcards.length > 0
    );

    chatsWithDecks.forEach((chat) => {
      const card = document.createElement("div");
      card.className = "topic-card";
      card.innerHTML = `
        <div class="topic-title">🧠 ${chat.name}</div>
        <div class="topic-preview">${chat.flashcards.length} cards</div>
        <button class="delete-item-btn">🗑️</button>
      `;

      card.querySelector('.delete-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Opravdu chcete smazat flashcards pro "${chat.name}"?`)) {
          chat.flashcards = null;
          chatState.save();
          ui.renderDeckGrid();
        }
      });

      // Add click listener to the card itself, excluding the button
      card.addEventListener("click", (e) => { if (e.target.tagName !== 'BUTTON') ui.openDeckDetail(chat.id) });
      DOM.flashcardDecks.appendChild(card);
    });
  },

  openDeckDetail(chatId) {
    const chat = chatState.chats.find((c) => c.id === chatId);
    if (!chat || !Array.isArray(chat.flashcards) || chat.flashcards.length === 0) return;

    DOM.flashcardDecks.classList.add("hidden");
    DOM.backToDecks.classList.remove("hidden");

    // Load the selected deck into the flashcard viewer
    flashcards.cards = chat.flashcards;
    flashcards.index = 0;
    flashcards.render();
  }
};


/****************************************************
 * FLASHCARDS
 ****************************************************/
const flashcards = {
  cards: [],
  index: 0,

  render() {
    if (!this.cards || this.cards.length === 0) {
      // Ensure the card is hidden if there are no cards to show
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

    // Render math on both sides of the card
    ui.renderMathInElement(DOM.flashFront);
    ui.renderMathInElement(DOM.flashBack);
  },

  next() {
    if (this.index >= this.cards.length - 1) return;

    const wasFlipped = DOM.flashcard.classList.contains("flipped");
    DOM.flashcard.classList.remove("flipped");

    // Wait for the flip animation to finish before changing content
    setTimeout(() => {
      this.index++;
      this.render();
    }, wasFlipped ? 300 : 0); // Use a shorter delay for a snappier feel
  },

  prev() {
    if (this.index <= 0) return;

    const wasFlipped = DOM.flashcard.classList.contains("flipped");
    DOM.flashcard.classList.remove("flipped");

    // Wait for the flip animation to finish before changing content
    setTimeout(() => {
      this.index--;
      this.render();
    }, wasFlipped ? 300 : 0); // Use a shorter delay for a snappier feel
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
        if (btn.dataset.tab === "flashcards") ui.renderDeckGrid();
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
  },

  initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const avatar = document.getElementById('toggleSidebar');

    if (!sidebar || !DOM.hamburgerBtn || !avatar) return;

    DOM.hamburgerBtn.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
    });
    avatar.addEventListener('click', () => {
      sidebar.classList.remove('collapsed');
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

    chatState.addNotes(reply);
    document.querySelector('[data-tab="notes"]').click();
  },

  /* GENERATE FLASHCARDS */
  async generateFlashcards() {
    const chat = chatState.getCurrent();
    const topic = chat.name;

    ui.addMessage("🧠 Generuji flashcards...", "assistant");

    const prompt = `
      Jsi expert na tvorbu vzdělávacích flashcards.
      Tvým úkolem je vytvořit ideální počet flashcards pro téma "${topic}" ve formátu:
      Q: otázka
      A: odpověď.
      Pro každý zadaný tematický okruh: zahrň pouze nejdůležitější pojmy, definice, pravidla, postupy a typické chyby.
      Každou dvojici odděl prázdným řádkem.
      Vybírej klíčové pojmy, vzorce, definice.
      A nedělej více než 30 flashcards.
      Každou kartičku udělej krátkou a konkrétní.
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

    chatState.addFlashcards(cards);
    document.querySelector('[data-tab="flashcards"]').click();
    ui.renderDeckGrid();
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
  events.initSidebar();
  events.initFileUpload();

  ui.renderThreads();
  ui.renderMessages();

  // Back button for notes
  DOM.backToNotes.addEventListener("click", () => {
    ui.renderNotesGrid();
  });

  DOM.backToDecks.addEventListener("click", () => {
    ui.renderDeckGrid();
  });

  // Temporary reset button logic
  DOM.resetAppBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.reload();
  });
});
