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

  // 1) Protect block math ($$...$$)
  const blockMath = [];
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
    const key = `__BLOCKMATH_${blockMath.length}__`;
    blockMath.push(match); 
    return key;
  });

  // 2) Protect inline math ($...$)
  const inlineMath = [];
  md = md.replace(/\$([^\$]+?)\$/g, (match) => {
    const key = `__INLINEMATH_${inlineMath.length}__`;
    inlineMath.push(match);
    return key;
  });

  // 3) Convert markdown WITHOUT breaking math
  let html = md

    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")

    // code
    .replace(/`(.+?)`/g, "<code>$1</code>");

  // 4) Replace newlines with <br>, but math placeholders won't break
  html = html.replace(/\n/g, "<br>");

  // 5) Restore math blocks
  blockMath.forEach((m, i) => {
    html = html.replace(`__BLOCKMATH_${i}__`, m);
  });

  // 6) Restore inline math
  inlineMath.forEach((m, i) => {
    html = html.replace(`__INLINEMATH_${i}__`, m);
  });

  return html;
}
,

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
    // Tabs
    this.tabs = document.querySelectorAll(".tab-btn");
    this.contents = document.querySelectorAll(".tab-content");

    // Sidebar
    this.userAvatar = document.getElementById("userAvatar");
    this.userName = document.getElementById("userName");
    this.hamburgerBtn = document.getElementById("hamburgerBtn");

    // Subjects
    this.newSubjectBtn = document.querySelector(".new-subject-btn");
    this.subjectList = document.querySelector(".subject-list");

    // Chat
    this.messages = document.getElementById("messages");
    this.input = document.getElementById("chatInput");
    this.sendBtn = document.getElementById("sendBtn");
    this.threadListEl = document.getElementById("threadList");
    this.newThreadBtn = document.getElementById("newThreadBtn");
    this.chatTitleEl = document.getElementById("chatTitle");
    this.plusBtn = document.getElementById("chatPlusBtn");
    this.actionMenu = document.getElementById("actionMenu");

    // Files
    this.upload = document.getElementById("fileUpload");
    this.fileList = document.getElementById("fileList");

    // Notes
    this.notesGrid = document.getElementById("notesTopics");
    this.noteDetail = document.getElementById("noteDetail");
    this.backToNotes = document.getElementById("backToNotes");
    this.noteDetailTitle = document.getElementById("noteDetailTitle");
    this.noteDetailContent = document.getElementById("noteDetailContent");

    // Flashcards
    this.flashcardDecks = document.getElementById("flashcardDecks");
    this.flashcard = document.getElementById("flashcard");
    this.flashFront = document.getElementById("flashFront");
    this.flashBack = document.getElementById("flashBack");
    this.flashNav = document.getElementById("flashNav");
    this.prevFlash = document.getElementById("prevFlash");
    this.nextFlash = document.getElementById("nextFlash");
    this.flashIndex = document.getElementById("flashIndex");
    this.backToDecks = document.getElementById("backToDecks");

    // Reset button
    this.resetAppBtn = document.getElementById("resetAppBtn");
    this.logoutBtn = document.getElementById("logoutBtn");

    return true;
  }
};

/****************************************************
 * 3. SUBJECT STATE
 ****************************************************/
const subjectState = {
  subjects: [],
  activeSubjectId: null,

  init() {
    // This becomes the main data store, loaded from localStorage.
    this.subjects = JSON.parse(localStorage.getItem("quizmate_subjects") || "[]");

    if (this.subjects.length === 0) {
      // If no subjects exist, create default data, including the old chats.
      const oldChats = JSON.parse(localStorage.getItem("quizmate_chats") || "[]");
      this.subjects = [
        { 
          id: 'subj-math', name: 'Mathematics', icon: '🧮',
          chats: oldChats.length > 0 ? oldChats : [
            { id: util.genId(), name: "Pythagorean Theorem", messages: [], notes: null, flashcards: null, tests: null },
            { id: util.genId(), name: "Linear Equations", messages: [], notes: null, flashcards: null, tests: null }
          ]
        },
        { id: 'subj-bio', name: 'Biology', icon: '🧬', chats: [] },
        { id: 'subj-hist', name: 'History', icon: '📜', chats: [] },
      ];
      this.save();
    }

    this.activeSubjectId = this.subjects[0]?.id || null;
  },

  save() {
    localStorage.setItem("quizmate_subjects", JSON.stringify(this.subjects));
  },

  addSubject(name) {
    const newSubject = {
      id: util.genId(),
      name,
      icon: "📘",
      chats: []
    };

    this.subjects.push(newSubject);
    this.save();

    // If no active subject, set this one
    if (!this.activeSubjectId) {
      this.activeSubjectId = newSubject.id;
    }

    ui.renderSubjects();
  },

  setActive(subjectId) {
    this.activeSubjectId = subjectId;
    
    // When switching subjects, select the first chat of that subject
    const firstChatId = this.getActiveSubject()?.chats[0]?.id || null;
    chatState.selectChat(firstChatId);

    // Re-render the UI to reflect the change
    ui.renderSubjects();
    ui.renderThreads();
    ui.renderMessages();
  },

  getActiveSubject() {
    return this.subjects.find(s => s.id === this.activeSubjectId);
  }
};

/****************************************************
 * 4. CHAT STATE
 ****************************************************/
const chatState = {
  currentChatId: null,

  init() {
    // Chat state now initializes based on the active subject
    this.currentChatId =
      localStorage.getItem("quizmate_current_chat") || subjectState.getActiveSubject()?.chats[0]?.id || null;

    localStorage.setItem("quizmate_current_chat", this.currentChatId);
  },

  getCurrent() {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return null;
    return activeSubject.chats.find((c) => c.id === this.currentChatId);
  },

  selectChat(id) {
    this.currentChatId = id;
    localStorage.setItem("quizmate_current_chat", id);
    const chat = this.getCurrent();
    DOM.chatTitleEl.textContent = chat ? chat.name : "Select a Chat";
    ui.renderThreads();
    ui.renderMessages();
  },

  addChat(name) {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return null;

    const chat = { id: util.genId(), name, messages: [], notes: null, flashcards: null, tests: null };
    activeSubject.chats.unshift(chat);
    subjectState.save();
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
    subjectState.save();
  },

  addFlashcards(cards) {
    const chat = this.getCurrent();
    if (!chat) return;
    if (!chat.flashcards) { // Ensure the array exists before adding to it
      chat.flashcards = [];
    }
    // Replace existing flashcards for this chat
    chat.flashcards = cards;
    subjectState.save();
  },

  addNotes(content) {
    const chat = this.getCurrent();
    if (!chat) return;
    
    let cleaned = content;

    // Remove intro lines (AI intros)
    cleaned = cleaned.replace(/^.*(Vítejte|Vítám|Welcome|Úvodem).*\n?/i, "");

    // Remove outro lines (AI closings)
    cleaned = cleaned.replace(/Tento\s+přehled.*$/i, "");
    cleaned = cleaned.replace(/Tato\s+rekapitulace.*$/i, "");
    cleaned = cleaned.replace(/Tento\s+souhrn.*$/i, "");
    cleaned = cleaned.replace(/This\s+summary.*$/i, "");

    chat.notes = {
      title: chat.name,
      content: cleaned.trim()
    };
    subjectState.save();
  },

  addTest(testData) {
    const chat = this.getCurrent();
    if (!chat) return;
    if (!chat.tests) { // Ensure the array exists before adding to it
      chat.tests = [];
    }
    chat.tests.push(testData); // Or replace, depending on desired logic
    subjectState.save();
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

  /* SUBJECTS */
  renderSubjects() {
    DOM.subjectList.innerHTML = ""; // Clear existing subjects

    subjectState.subjects.forEach(subject => {
      const subjectItem = document.createElement('li');
      subjectItem.className = 'subject';
      subjectItem.dataset.id = subject.id;

      if (subject.id === subjectState.activeSubjectId) {
        subjectItem.classList.add('active');
      }

      subjectItem.innerHTML = `
        <span class="icon">${subject.icon}</span>
        <span class="subject-text">${subject.name}</span>
        <button class="delete-thread-btn delete-subject-btn" data-id="${subject.id}">🗑️</button>
      `;

      // Add click listener to the entire item to switch the active subject
      subjectItem.addEventListener('click', () => subjectState.setActive(subject.id));

      // Add click listener for the delete button
      subjectItem.querySelector('.delete-subject-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Opravdu chcete smazat předmět "${subject.name}" a všechny jeho chaty?`)) {
          const wasActive = subject.id === subjectState.activeSubjectId;
          
          // Remove the subject
          subjectState.subjects = subjectState.subjects.filter(s => s.id !== subject.id);
          subjectState.save();

          // If the deleted subject was active, select the first remaining one
          if (wasActive && subjectState.subjects.length > 0) {
            subjectState.setActive(subjectState.subjects[0].id);
          } else {
            // Just re-render if no subjects are left or a non-active one was deleted
            ui.renderSubjects();
          }
        }
      });

      DOM.subjectList.appendChild(subjectItem);
    });
  },

  /* THREADS */
  renderThreads() {
    DOM.threadListEl.innerHTML = "";
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return;

    activeSubject.chats.forEach((chat) => {
      const li = document.createElement("li");
      li.className =
        "thread-item" + (chat.id === chatState.currentChatId ? " active" : "");

      const name = document.createElement("span");
      name.textContent = chat.name;
      name.className = "thread-name"; // This is the key change
      name.addEventListener("click", () => chatState.selectChat(chat.id));

      const del = document.createElement("button");
      del.textContent = "🗑️";
      del.className = "delete-thread-btn";

      del.addEventListener("click", (e) => {
        e.stopPropagation();
        activeSubject.chats = activeSubject.chats.filter((c) => c.id !== chat.id);
        subjectState.save();

        if (chatState.currentChatId === chat.id) { // If we deleted the active chat
          const newActiveChatId = activeSubject.chats[0]?.id || null;
          chatState.selectChat(newActiveChatId); // Select the next available chat
        }

        ui.renderThreads();
        ui.renderMessages();
      });

      li.appendChild(name);
      li.appendChild(del);

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
    const chat = chatState.getCurrent(); // This now gets the chat from the active subject
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
    DOM.notesGrid.classList.remove("hidden");
    DOM.notesGrid.innerHTML = "";

    // Find chats that have notes
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return;

    const chatsWithNotes = activeSubject.chats.filter(
      (chat) => chat.notes && chat.notes.content.trim()
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
          subjectState.save();
          ui.renderNotesGrid();
        }
      });

      // Add click listener to the card itself, excluding the button
      card.addEventListener("click", (e) => { if (e.target.tagName !== 'BUTTON') ui.openNoteDetail(chat.id) });
      DOM.notesGrid.appendChild(card);
    });
  },

  openNoteDetail(chatId) {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return;

    const chat = activeSubject.chats.find((c) => c.id === chatId);
    if (!chat || !chat.notes) return;

    DOM.noteDetailTitle.textContent = chat.notes.title;
    DOM.noteDetailContent.innerHTML = util.markdownToHtml(chat.notes.content);

    DOM.notesGrid.classList.add("hidden");
    DOM.noteDetail.classList.remove("hidden");
    DOM.backToNotes.classList.remove("hidden");

    DOM.noteDetail.scrollTop = 0;

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
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return;

    const chatsWithDecks = activeSubject.chats.filter(
      (c) => Array.isArray(c.flashcards) && c.flashcards.length > 0
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
          subjectState.save();
          ui.renderDeckGrid();
        }
      });

      // Add click listener to the card itself, excluding the button
      card.addEventListener("click", (e) => { if (e.target.tagName !== 'BUTTON') ui.openDeckDetail(chat.id) });
      DOM.flashcardDecks.appendChild(card);
    });
  },

  openDeckDetail(chatId) {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return;

    const chat = activeSubject.chats.find((c) => c.id === chatId);
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
    const subjectName = subjectState.getActiveSubject()?.name || "všeobecné";

    const system = {
      role: "user",
      content: `Jsi expert na téma **${subjectName}**. Odpovídej na otázky v kontextu tohoto předmětu.
      Téma chatu je: ${topic}. Odpovídej česky.`
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

    if (!sidebar || !DOM.hamburgerBtn || !DOM.userAvatar) return;

    // Collapse sidebar
    DOM.hamburgerBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    // Uncollapse sidebar when clicking avatar
    DOM.userAvatar.addEventListener('click', () => {
      sidebar.classList.remove('collapsed');
  });
},

  initSubjects() {
    if (!DOM.newSubjectBtn || !DOM.subjectList) return;

    DOM.newSubjectBtn.addEventListener("click", () => {
      const name = prompt("Název nového předmětu:");
      if (!name) return;

      subjectState.addSubject(name);
      ui.renderSubjects();
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

    let levelText = "";

    if (window.quizmateLevel === "zakladka") {
      levelText = "Piš jednoduše, srozumitelně, jako pro 5.–9. třídu.";
    }
    if (window.quizmateLevel === "stredni") {
      levelText = "Piš středoškolsky, používej běžné matematické termíny.";
    }
    if (window.quizmateLevel === "vysoka") {
      levelText = "Piš vysokoškolskou úrovní, detailně, teoreticky.";
    }

    const prompt = `
      ${levelText}
      Vytvoř přehledné, strukturované a kvalitní výpisky k tématu **${topic}**.
      Použij nadpisy, odrážky, vysvětlení, vzorce (KaTeX), příklady.
      Vycházej z předchozí konverzace.
      `;

    // Get the previous messages and add the new instruction at the end.
    const ctx = api.getContextMessages();
    const messagesForAI = [...ctx, { role: "user", content: prompt }];

    const reply = await api.askAI(messagesForAI);

    chatState.addNotes(reply);
    document.querySelector('[data-tab="notes"]').click();
  },

  /* GENERATE FLASHCARDS */
  async generateFlashcards() {
    const chat = chatState.getCurrent();
    const topic = chat.name;

    ui.addMessage("🧠 Generuji flashcards...", "assistant");

    let levelText = "";

    if (window.quizmateLevel === "zakladka") {
      levelText = "Piš základoškolskou úrovní. Vysvětluj jako pro studenty na základní škole.";
    }
    if (window.quizmateLevel === "stredni") {
      levelText = "Piš středoškolskou úrovní. Vysvětluj jako pro studenty na střední škole.";
    }
    if (window.quizmateLevel === "vysoka") {
      levelText = "Piš vysokoškolskou úrovní. Vysvětluj jako pro studenty na vysoké škole.";
    }

    const prompt = `
      ${levelText}
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

    // Get the previous messages and add the new instruction at the end.
    const ctx = api.getContextMessages();
    const messagesForAI = [...ctx, { role: "user", content: prompt }];

    const reply = await api.askAI(messagesForAI);

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

  // Load user data
  const user = JSON.parse(localStorage.getItem("quizmate_user") || "{}");

  // Redirect if not logged in
  if (!user.name) {
    window.location.href = "/login";
    return; // STOP running initialization
  }

  // Initialize DOM FIRST so elements exist
  DOM.init();

  // Now we can safely apply user info
  if (DOM.userName) DOM.userName.textContent = user.name;

  if (DOM.userAvatar) {
    if (user.avatar && user.avatar.startsWith("data:image")) {
      DOM.userAvatar.style.backgroundImage = `url(${user.avatar})`;
      DOM.userAvatar.style.backgroundSize = "cover"; // This is already in style.css but good to be explicit
      DOM.userAvatar.style.backgroundPosition = "center";
      DOM.userAvatar.textContent = "";
    } else {
      DOM.userAvatar.style.backgroundImage = "";
      DOM.userAvatar.textContent = user.avatar || "U";
    }
  }

  // Save level globally
  window.quizmateLevel = user.level || "stredni";

  // Initialize rest of the app
  subjectState.init();
  chatState.init();

  events.initTabs();
  events.initChat();
  events.initFlashcards();
  events.initSidebar();
  events.initFileUpload();
  events.initSubjects();

  ui.renderSubjects();
  ui.renderThreads();
  ui.renderMessages();

  // Back button for notes
  if (DOM.backToNotes) {
    DOM.backToNotes.addEventListener("click", () => {
      DOM.noteDetail.classList.add("hidden");
      DOM.backToNotes.classList.add("hidden");

      DOM.notesGrid.classList.remove("hidden");
      ui.renderNotesGrid();
    });
  }

  // Back button for flashcard decks
  if (DOM.backToDecks) {
    DOM.backToDecks.addEventListener("click", () => {
      ui.renderDeckGrid();
    });
  }

  // Reset app
  if (DOM.resetAppBtn) {
    DOM.resetAppBtn.addEventListener("click", () => {
      localStorage.clear();
      window.location.reload();
    });
  }

  // Logout button
  if (DOM.logoutBtn) {
    DOM.logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("quizmate_user");
      window.location.href = "/login";
    });
  }
});