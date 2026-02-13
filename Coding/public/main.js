/****************************************************
 * 1. KONSTANTY A UTILITY FUNKCE
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

    const blockMath = [];
    md = md.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
      const key = `__BLOCKMATH_${blockMath.length}__`;
      blockMath.push(match); 
      return key;
    });

    const inlineMath = [];
    md = md.replace(/\$([^\$]+?)\$/g, (match) => {
      const key = `__INLINEMATH_${inlineMath.length}__`;
      inlineMath.push(match);
      return key;
    });

    let html = md
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

    html = html.replace(/\n/g, "<br>");
    blockMath.forEach((m, i) => html = html.replace(`__BLOCKMATH_${i}__`, m));
    inlineMath.forEach((m, i) => html = html.replace(`__INLINEMATH_${i}__`, m));

    return html;
  },

  autoResize(el) { // Temporarily hide scrollbar to get correct scrollHeight
    const originalOverflow = el.style.overflowY;
    el.style.overflowY = 'hidden';
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 600) + "px";
    el.style.overflowY = originalOverflow;
  }
};

const DOM = {
  init() {
    // Main sections
    this.subjectsOverview = document.getElementById("subjects-overview");
    this.subjectDetail = document.getElementById("subject-detail");
    this.subjectsGrid = document.getElementById("subjectsGrid");
    this.backToSubjects = document.getElementById("backToSubjects");
    this.subjectDetailTitle = document.getElementById("subjectDetailTitle");
    this.newSubjectOverviewBtn = document.getElementById("newSubjectOverviewBtn");

    // Tabs
    this.tabs = document.querySelectorAll(".tab-btn");
    this.contents = document.querySelectorAll(".tab-content");

    // Sidebar content
    this.sidebarOverview = document.getElementById("sidebar-overview");
    this.sidebarDetail = document.getElementById("sidebar-detail");
    this.subjectIcon = document.getElementById("subjectIcon");
    this.subjectName = document.getElementById("subjectName");
    this.chatCount = document.getElementById("chatCount");
    this.notesCount = document.getElementById("notesCount");
    this.flashcardsCount = document.getElementById("flashcardsCount");
    this.deleteSubjectBtn = document.getElementById("deleteSubjectBtn");

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
    this.newNoteBtn = document.getElementById("newNoteBtn");

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
    this.newFlashcardBtn = document.getElementById("newFlashcardBtn");

    // Tests
    this.testsGrid = document.getElementById("testsTopics");
    this.testDetail = document.getElementById("testDetail");
    this.backToTests = document.getElementById("backToTests");
    this.testDetailTitle = document.getElementById("testDetailTitle");
    this.testQuestionsContainer = document.getElementById("testQuestionsContainer");
    this.newTestBtn = document.getElementById("newTestBtn");
    this.testsCount = document.getElementById("testsCount");

    // Logout button
    this.logoutBtn = document.getElementById("logoutBtn");

    // Settings Modal
    this.settingsModal = document.getElementById("settings-modal");
    this.closeModalButton = this.settingsModal?.querySelector(".close-button");

    return true;
  }
};

/****************************************************
 * 2. STAV APLIKACE (STATE OBJEKTY)
 ****************************************************/
const subjectState = {
  subjects: [],
  activeSubjectId: null,

  async init() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error("Chybí token, nelze načíst předměty.");
      this.subjects = [];
      return;
    } 

    try {
      const response = await fetch('/api/subjects', {
        headers: { 'x-auth-token': token }
      });

      if (response.status === 401) {
        // Neplatný token, odhlásíme uživatele
        localStorage.clear();
        window.location.href = '/login.html';
        return;
      }
      if (!response.ok) throw new Error('Nepodařilo se načíst předměty.');

      const subjectsFromServer = await response.json();
      // Mongoose vrací _id, my v aplikaci používáme id
      this.subjects = subjectsFromServer.map(s => ({ 
        ...s, 
        id: s._id,
        // Zajistíme, že i vnořené chaty mají správné `id`
        chats: s.chats ? s.chats.map(c => ({...c, id: c._id})) : []
      }));

    this.activeSubjectId = this.subjects[0]?.id || null;

    } catch (error) {
      console.error("Chyba při inicializaci předmětů:", error);
    }
  },

  // Nová funkce pro uložení změn na server
  async saveActiveSubject() {
    const token = localStorage.getItem('authToken');
    const subject = this.getActiveSubject();
    if (!token || !subject) return null;

    // Vytvoříme kopii dat pro odeslání, bez `id` které Mongoose nemá rád v těle
    const subjectData = { ...subject };
    delete subjectData.id;
    delete subjectData._id; // Pro jistotu

    try {
      const response = await fetch(`/api/subjects/${subject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(subjectData),
      });
      if (!response.ok) throw new Error('Nepodařilo se uložit změny na server.');

      // Zde je klíčová oprava: Aktualizujeme lokální data odpovědí ze serveru
      const updatedSubjectFromServer = await response.json();
      const subjectIndex = this.subjects.findIndex(s => s.id === subject.id);
      if (subjectIndex !== -1) {
        const updatedSubjectWithMappedIds = { 
          ...updatedSubjectFromServer, 
          id: updatedSubjectFromServer._id, 
          chats: updatedSubjectFromServer.chats ? updatedSubjectFromServer.chats.map(c => ({...c, id: c._id})) : []
        };
        this.subjects[subjectIndex] = updatedSubjectWithMappedIds;
        return updatedSubjectWithMappedIds; // Vrátíme aktualizovaná data S IDs!
      }
      return updatedSubjectFromServer;
    } catch (error) {
      console.error("Chyba při ukládání předmětu:", error);
      alert("Chyba při ukládání změn. Zkuste obnovit stránku.");
      return null;
    }
  },

  async addSubject(name, icon = "📘") {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ name, icon }),
      });

      if (!response.ok) throw new Error('Nepodařilo se přidat předmět.');

      const newSubjectFromServer = await response.json();
      const newSubject = { 
        ...newSubjectFromServer, 
        id: newSubjectFromServer._id,
        chats: [] // Zajistíme, že nový předmět má pole pro chaty
      };

      this.subjects.push(newSubject);

      // Pokud nebyl žádný aktivní, nastavíme tento
      if (!this.activeSubjectId) {
        this.activeSubjectId = newSubject.id;
      }

      ui.renderSubjectsGrid();
      return newSubject; // Vrátíme přidaný předmět pro případné další použití
    } catch (error) {
      console.error("Chyba při přidávání předmětu:", error);
      alert("Chyba při přidávání předmětu. Zkuste to prosím znovu.");
    }
  },

  setActive(subjectId) {
    this.activeSubjectId = subjectId;
    
    // When switching subjects, reset the active chat.
    // This prevents "data leakage" between subjects (e.g., showing old flashcards).
    const activeSubject = this.getActiveSubject();
    const firstChatId = (activeSubject?.chats && activeSubject.chats.length > 0) ? activeSubject.chats[0].id : null;
    chatState.selectChat(firstChatId);

    // Re-render the UI to reflect the change
    ui.renderThreads();
    ui.renderMessages();
    ui.renderNotesGrid();
    ui.renderDeckGrid();
    ui.renderTestsGrid();
    ui.renderFiles();
    ui.updateSubjectSidebar();
  },

  getActiveSubject() {
    return this.subjects.find(s => s.id === this.activeSubjectId);
  }
};

const fileState = {
  async addFile(fileData) {
    const subject = subjectState.getActiveSubject();
    
    if (!subject) return;
    
    if (!subject.files) subject.files = [];

    const cleanFileData = {
      name: fileData.name,
      content: fileData.content,
      type: fileData.type,
      size: fileData.size
    };
   
    // Přidáme nový soubor do pole
    subject.files.push(fileData);

    // Odesílání do DB a čekání na dokončení
    ui.showFileProcessingLoader("Ukládání do databáze...");
    await subjectState.saveActiveSubject();
    ui.renderFiles();
  }
};

const chatState = {
  currentChatId: null,

  init(username) {
    // Chat state now initializes based on the active subject
    this.username = username;
    const key = `quizmate_current_chat_${username}`;
    const activeSubject = subjectState.getActiveSubject();
    this.currentChatId = localStorage.getItem(key) || subjectState.getActiveSubject()?.chats[0]?.id || null;

    if(this.currentChatId) localStorage.setItem(key, this.currentChatId);
  },

  getCurrent() {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return null;
    return activeSubject.chats.find((c) => c.id === this.currentChatId);
  },

  selectChat(id) {
    this.currentChatId = id;
    const chat = this.getCurrent();
    const key = `quizmate_current_chat_${this.username}`;
    if (id) localStorage.setItem(key, id); else localStorage.removeItem(key);
    DOM.chatTitleEl.textContent = chat ? chat.name : "Select a Chat";
    ui.renderThreads();
    ui.renderMessages();
  },

  async addChat(name) {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return null;

    // Vytvoříme chat bez ID, to přiřadí databáze
    const chat = { name, messages: [], notes: null, flashcards: null, tests: null };
    activeSubject.chats.unshift(chat);
    await subjectState.saveActiveSubject(); // Uložíme na server a POČKÁME
    return chat;
  },

  addMessage(text, role) {
    const chat = this.getCurrent();
    if (!chat) return;
    chat.messages.push({
      id: util.genId(),
      role,
      content: text,
      timestamp: new Date().toISOString()
    });
    return subjectState.saveActiveSubject();
  },

  addFlashcards(cards) {
    const chat = this.getCurrent();
    if (!chat) return;
    if (!chat.flashcards) { // Ensure the array exists before adding to it
      chat.flashcards = [];
    }
    // Replace existing flashcards for this chat
    chat.flashcards = cards;
    return subjectState.saveActiveSubject();
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
    return subjectState.saveActiveSubject();
  },

  addTest(testData) {
    const chat = this.getCurrent();
    if (!chat) return;
    if (!chat.tests) { // Ensure the array exists before adding to it
      chat.tests = [];
    }
    chat.tests = [testData]; // Replace previous tests for this chat
    return subjectState.saveActiveSubject();
  }
};

/****************************************************
 * 3. PRÁCE S API / BACKENDEM / AI
 ****************************************************/
const api = {
  MAX_CONTEXT: 10,

  getContextMessages() {
    const chat = chatState.getCurrent();
    return chat.messages.slice(-this.MAX_CONTEXT);
  },

  async askAI(userMessage) {
    const subject = subjectState.getActiveSubject();
    const chat = chatState.getCurrent();
    if (!chat) return;

    // --- 1. Sestavení pole zpráv (Konstrukce historie) ---
    
    // A) Systémová zpráva
    const rawMessages = [
      {
        role: "system",
        content: `Jsi QuizMate AI asistent na předmět ${subject.name} pro úroveň: ${window.quizmateLevel || "stredni"}. 
        Pomáhej studentovi s tématem: ${chat.name}. 
        Pokud jsou v kontextu soubory, čerpej primárně z nich.`
      }
    ];

    // B) Přidání kontextu ze SOUBORŮ
    if (subject.files && subject.files.length > 0) {
      subject.files.forEach(file => {
        if (file.content.startsWith("data:image")) {
          // Obrázek
          rawMessages.push({
            role: "user",
            content: file.content 
          });
          rawMessages.push({
            role: "system",
            content: `Výše je nahraný obrázek: ${file.name}. Analyzuj ho a měj ho v paměti.`
          });
        } else {
          // Text (TXT, PDF...)
          rawMessages.push({
            role: "system",
            content: `Kontext ze souboru ${file.name}:\n${file.content}`
          });
        }
      });
    }

    // C) Přidání historie chatu
    // Pozor: Zde jen kopírujeme, nečistíme. To uděláme až nakonec.
    chat.messages.forEach(m => rawMessages.push(m));

    // D) Přidání aktuální zprávy uživatele
    rawMessages.push({ role: "user", content: userMessage });

    // --- 2. Sanitizace a příprava pro API (Tady opravujeme chybu) ---
    // Teprve teď, když máme 'rawMessages' plné, uděláme mapování.
    const cleanedMessages = rawMessages.map(m => ({
        // Gemini API vyžaduje roli 'model' místo 'assistant'
        role: m.role === "assistant" ? "model" : (m.role === "system" ? "user" : m.role), 
        // Zajistíme, že content je String (pokud je to objekt, převedeme na JSON)
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    }));

    // --- 3. Volání backendu ---
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: cleanedMessages }) // Posíláme vyčištěná data
      });

      if (!response.ok) {
         const errData = await response.json();
         throw new Error(errData.error || "AI neodpovídá.");
      }
      
      const data = await response.json();
      return data.reply;

    } catch (error) {
      console.error("AskAI Error:", error);
      throw error; // Vyhodíme chybu výš, aby ji zachytil volající (sendMessage)
    }
  }
};


/****************************************************
 * 4. UI LOGIKA (RENDER FUNKCE)
 ****************************************************/
const ui = {
  
  async readFileData(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    // Inicializace PDF.js workeru
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    // TEXT & MARKDOWN
    if (extension === 'txt' || extension === 'md') {
      return await file.text();
    } 

    // WORD (.docx)
    if (extension === 'docx') {
      if (!window.mammoth) throw new Error("Knihovna Mammoth.js není načtena v index.html");
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }

    // PDF
    if (extension === 'pdf') {
      if (!window.pdfjsLib) throw new Error("Knihovna PDF.js není načtena v index.html");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + "\n";
      }
      return fullText;
    }

    // OBRÁZKY (pro Gemini Vision)
    if (['png', 'jpg', 'jpeg'].includes(extension)) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    // PPTX (zatím nepodporováno přímo)
    if (extension === 'pptx') {
      throw new Error("Formát .pptx zatím není podporován. Uložte prezentaci jako PDF a nahrajte ji znovu.");
    }

    throw new Error("Nepodporovaný formát souboru.");
  },
  

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
        e.stopPropagation(); // Zabráníme prokliknutí na celý předmět
        if (confirm(`Opravdu chcete smazat předmět "${subject.name}"?`)) {
          const token = localStorage.getItem('authToken');
          fetch(`/api/subjects/${subject.id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
          }).then(res => {
            if (!res.ok) throw new Error('Smazání selhalo');
            
            const wasActive = subject.id === subjectState.activeSubjectId;
            subjectState.subjects = subjectState.subjects.filter(s => s.id !== subject.id);

            if (wasActive && subjectState.subjects.length > 0) {
              subjectState.setActive(subjectState.subjects[0].id);
            } else {
              ui.renderSubjectsGrid();
            }
          }).catch(err => alert(err.message));
        }
      });

      DOM.subjectList.appendChild(subjectItem);
    });
  },

  renderSubjectsGrid() {
    DOM.subjectsGrid.innerHTML = "";

    subjectState.subjects.forEach(subject => {
      const card = document.createElement("div");
      card.className = "subject-card";
      card.dataset.id = subject.id;

      const chatsCount = subject.chats ? subject.chats.length : 0;
      const notesCount = subject.chats ? subject.chats.filter(chat => typeof chat.notes === "string" ? chat.notes.trim() !== "" : chat.notes && Object.keys(chat.notes).length > 0).length : 0;
      const flashcardsCount = subject.chats ? subject.chats.filter(chat => Array.isArray(chat.flashcards) && chat.flashcards.length > 0).length : 0;
      const testsCount = subject.chats ? subject.chats.filter(chat => Array.isArray(chat.tests) && chat.tests.length > 0).length : 0;

      card.innerHTML = `
        <div class="subject-card-icon">${subject.icon}</div>
        <div class="subject-card-title">${subject.name}</div>
        <div class="subject-card-stats">
          <div class="subject-stat">
            <div class="subject-stat-number">${chatsCount}</div>
            <div class="subject-stat-label">Chats</div>
          </div>
          <div class="subject-stat">
            <div class="subject-stat-number">${notesCount}</div>
            <div class="subject-stat-label">Notes</div>
          </div>
          <div class="subject-stat">
            <div class="subject-stat-number">${flashcardsCount}</div>
            <div class="subject-stat-label">Cards</div>
          </div>
          <div class="subject-stat">
            <div class="subject-stat-number">${testsCount}</div>
            <div class="subject-stat-label">Tests</div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => ui.selectSubject(subject.id));
      DOM.subjectsGrid.appendChild(card);
    });
  },

  showSubjectsOverview() {
    DOM.subjectsOverview.classList.remove("hidden");
    DOM.subjectDetail.classList.add("hidden");
    DOM.sidebarOverview.classList.remove("hidden");
    DOM.sidebarDetail.classList.add("hidden");
  },

  showSubjectDetail() {
    DOM.subjectsOverview.classList.add("hidden");
    DOM.subjectDetail.classList.remove("hidden");
    DOM.sidebarOverview.classList.add("hidden");
    DOM.sidebarDetail.classList.remove("hidden");
  },

  selectSubject(subjectId) {
    subjectState.setActive(subjectId);
    ui.showSubjectDetail();
    ui.updateSubjectSidebar();

    // Ensure all event handlers are properly attached for the detail view
    events.initTabs();
    events.initChat();
    events.initNotes();
    events.initFlashcards();
    events.initTests();
    events.initFileUpload();

    // Render all content for the selected subject
    ui.renderThreads();
    ui.renderMessages();
    ui.renderNotesGrid();
    ui.renderDeckGrid();
    ui.renderTestsGrid();
    ui.renderFiles();
  },

  updateSubjectSidebar() {
    const subject = subjectState.getActiveSubject();
    if (!subject) return;

    DOM.subjectIcon.textContent = subject.icon;
    DOM.subjectName.textContent = subject.name;
    DOM.subjectDetailTitle.textContent = subject.name;

    const chatsCount = subject.chats ? subject.chats.length : 0;
    const notesCount = subject.chats ? subject.chats.filter(chat => typeof chat.notes === "string" ? chat.notes.trim() !== "" : chat.notes && Object.keys(chat.notes).length > 0).length : 0;
    const flashcardsCount = subject.chats ? subject.chats.filter(chat => Array.isArray(chat.flashcards) && chat.flashcards.length > 0).length : 0;
    const testsCount = subject.chats ? subject.chats.filter(chat => Array.isArray(chat.tests) && chat.tests.length > 0).length : 0;

    DOM.chatCount.textContent = chatsCount;
    DOM.notesCount.textContent = notesCount;
    DOM.flashcardsCount.textContent = flashcardsCount;
    DOM.testsCount.textContent = testsCount;
  },

  /* THREADS */
  renderThreads() {
    DOM.threadListEl.innerHTML = "";
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return;

    activeSubject.chats.forEach((chat) => {
      const li = document.createElement("li");
      li.className = "thread-item" + (chat.id === chatState.currentChatId ? " active" : "");

      const name = document.createElement("span");
      name.textContent = chat.name;
      name.className = "thread-name"; // This is the key change
      name.addEventListener("click", () => chatState.selectChat(chat.id));

      const del = document.createElement("button");
      del.textContent = "🗑️";
      del.className = "delete-thread-btn";

      del.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Opravdu chcete smazat tento chat?")) {
          const chatToDelete = chat; // Store reference
          try {
            activeSubject.chats = activeSubject.chats.filter((c) => c.id !== chat.id); 
            await subjectState.saveActiveSubject(); // Wait for save to succeed

            if (chatState.currentChatId === chat.id) {
              const newActiveChatId = activeSubject.chats[0]?.id || null;
              chatState.selectChat(newActiveChatId);
            }

            ui.renderThreads();
            ui.renderMessages();
            ui.renderSubjectsGrid();
          } catch (error) {
            alert("Chyba při mazání chatu: " + error.message);
            // Revert the local change
            activeSubject.chats.push(chatToDelete);
            ui.renderThreads();
            ui.renderSubjectsGrid();
          }
        }
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

    if (msg.role === "user") {
      // Get the current user's data to display their avatar
      const user = JSON.parse(localStorage.getItem("quizmate_current_user") || "{}");
      if (user.avatar && user.avatar.startsWith("data:image")) {
        avatar.style.backgroundImage = `url(${user.avatar})`;
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.textContent = ""; // Clear the placeholder text
      } else {
        avatar.textContent = user.avatar || "U";
      }
    } else {
      avatar.textContent = "AI";
    }
    
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
    if (!chat) {
      DOM.messages.innerHTML = "Zatím zde není žádný chat. Vytvořte nový.";
      return;
    }

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
    DOM.newNoteBtn.classList.remove("hidden");
    DOM.notesGrid.innerHTML = "";

    // Find chats that have notes
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject || !activeSubject.chats) return;

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
          subjectState.saveActiveSubject().then(() => ui.renderNotesGrid()); // Správně
        }
      });

      // Add click listener to the card itself, excluding the button
      card.addEventListener("click", (e) => { if (e.target.tagName !== 'BUTTON') ui.openNoteDetail(chat.id) });
      DOM.notesGrid.appendChild(card);
    });
  },

  openNoteDetail(chatId) {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject || !activeSubject.chats) return;

    const chat = activeSubject.chats.find((c) => c.id === chatId);
    if (!chat || !chat.notes) return;

    DOM.noteDetailTitle.textContent = chat.notes.title;
    DOM.noteDetailContent.innerHTML = util.markdownToHtml(chat.notes.content);

    DOM.notesGrid.classList.add("hidden");
    DOM.noteDetail.classList.remove("hidden");
    DOM.backToNotes.classList.remove("hidden");
    DOM.newNoteBtn.classList.add("hidden");

    DOM.noteDetail.scrollTop = 0;

    this.renderMathInElement(DOM.noteDetailContent);
  },

  /* FILES */
  renderFiles() {
    DOM.fileList.innerHTML = "";
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject || !activeSubject.files) return;

    activeSubject.files.forEach(file => {
      const fileEl = document.createElement('div');
      fileEl.className = 'file-item';
      fileEl.innerHTML = `
        <span>📄 ${file.name} (${Math.round(file.size / 1024)} KB)</span>
        <button class="delete-item-btn" data-id="${file.id}">🗑️</button>
      `;

      fileEl.querySelector('.delete-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Opravdu chcete smazat soubor "${file.name}"?`)) {
          activeSubject.files = activeSubject.files.filter(f => f.id !== file.id); // TODO: Ukládání přes API
          this.renderFiles();
        }
      });

      DOM.fileList.appendChild(fileEl);
    });
  },

  showFileProcessingLoader(message) {
    DOM.fileList.innerHTML = `<div class="file-item typing">${message}</div>`;
  },

  /* FLASHCARDS */
  renderDeckGrid() {
    DOM.flashcard.classList.add("hidden");
    DOM.flashNav.classList.add("hidden");
    DOM.backToDecks.classList.add("hidden");
    DOM.flashcardDecks.classList.remove("hidden");
    DOM.newFlashcardBtn.classList.remove("hidden");
    DOM.flashcardDecks.innerHTML = "";

    // Find chats that have flashcards
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject || !activeSubject.chats) return;

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
          subjectState.saveActiveSubject().then(() => ui.renderDeckGrid()); // Správně
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
    DOM.flashcard.classList.remove("hidden");
    DOM.flashcard.classList.remove('flipped'); // Ensure card starts on front
    DOM.flashNav.classList.remove("hidden");
    DOM.backToDecks.classList.remove("hidden");
    DOM.newFlashcardBtn.classList.add("hidden");

    // Load the selected deck into the flashcard viewer
    flashcards.cards = chat.flashcards;
    flashcards.index = 0;
    flashcards.render();
  },

  /* TESTS */
  renderTestsGrid() {
    DOM.testDetail.classList.add("hidden");
    DOM.backToTests.classList.add("hidden");
    DOM.testsGrid.classList.remove("hidden");
    DOM.newTestBtn.classList.remove("hidden");
    DOM.testsGrid.innerHTML = "";

    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject || !activeSubject.chats) return;

    const chatsWithTests = activeSubject.chats.filter(
      (c) => Array.isArray(c.tests) && c.tests.length > 0
    );

    chatsWithTests.forEach((chat) => {
      const card = document.createElement("div");
      card.className = "topic-card";
      card.innerHTML = `
        <div class="topic-title">🧪 ${chat.name}</div>
        <div class="topic-preview">${chat.tests[0].questions.length} questions</div>
        <button class="delete-item-btn">🗑️</button>
      `;

      card.querySelector('.delete-item-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Opravdu chcete smazat test pro "${chat.name}"?`)) {
          chat.tests = null;
          subjectState.saveActiveSubject().then(() => ui.renderTestsGrid()); // Správně
        }
      });

      card.addEventListener("click", (e) => { if (e.target.tagName !== 'BUTTON') ui.openTestDetail(chat.id) });
      DOM.testsGrid.appendChild(card);
    });
  },

  openTestDetail(chatId) {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject) return;

    const chat = activeSubject.chats.find((c) => c.id === chatId);
    if (!chat || !Array.isArray(chat.tests) || chat.tests.length === 0) return;

    const test = chat.tests[0];

    // Bezpečné nastavení textu (pokud element existuje)
    if (DOM.testDetailTitle) DOM.testDetailTitle.textContent = `Test: ${chat.name}`;
    if (DOM.testQuestionsContainer) DOM.testQuestionsContainer.innerHTML = "";

    test.questions.forEach((q, index) => {
      const questionEl = document.createElement('div');
      questionEl.className = 'test-question';
      
      let optionsHtml = q.options.map((opt, i) => `
        <label class="test-option">
          <input type="radio" name="question-${index}" value="${util.escapeHtml(opt)}">
          <span>${util.escapeHtml(opt)}</span>
        </label>
      `).join('');

      questionEl.innerHTML = `
        <p class="question-text"><strong>${index + 1}.</strong> ${util.escapeHtml(q.text)}</p>
        <div class="options-container">${optionsHtml}</div>
        <div class="result-feedback"></div>
      `;
      DOM.testQuestionsContainer.appendChild(questionEl);
    });

    // Add submit button
    const submitBtn = document.createElement('button');
    submitBtn.id = 'submitTestBtn';
    submitBtn.className = 'submitBtn';
    
    submitBtn.style.cssText = `
        position: relative;
        display: block;
        margin-top: 20px;
        margin-bottom: 10px;
        background: linear-gradient(135deg, var(--primary-1), var(--primary-2));
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        width: fit-content;
    `;
    submitBtn.onmouseenter = () => { submitBtn.style.opacity = '0.96'; };
    submitBtn.onmouseleave = () => { submitBtn.style.opacity = '1'; };


    // OPRAVA: Třídy přidáme rovnou zde, ne přes neexistující DOM.submitBtn
    submitBtn.className = 'submitBtn newBtn'; 
    submitBtn.textContent = 'Submit Test';
    submitBtn.onclick = () => events.submitTest(chatId);
    
    DOM.testQuestionsContainer.appendChild(submitBtn);

    // --- ZDE BYLA CHYBA (DOM.submitBtn neexistuje), řádek smazán ---

    // Skrývání a zobrazování sekcí
    if (DOM.testsGrid) DOM.testsGrid.classList.add("hidden");
    if (DOM.newTestBtn) DOM.newTestBtn.classList.add("hidden");

    if (DOM.testDetail) {
        DOM.testDetail.classList.remove("hidden");
        DOM.testDetail.scrollTop = 0;
    }

    // Bezpečné zobrazení tlačítka zpět
    if (DOM.backToTests) {
        DOM.backToTests.classList.add('btn', 'small', 'outline');
        DOM.backToTests.classList.remove("hidden");
    }

    // Renderování matematiky (pokud je funkce dostupná)
    if (this.renderMathInElement && DOM.testQuestionsContainer) {
        this.renderMathInElement(DOM.testQuestionsContainer);
    }
  }
  };

const flashcards = {
  cards: [],
  index: 0,

  render() {
    if (!this.cards || this.cards.length === 0) {
      console.log('[FLASHCARD] No cards to render');
      const flashcard = document.getElementById("flashcard");
      if (flashcard) flashcard.classList.add("hidden");
      const flashNav = document.getElementById("flashNav");
      if (flashNav) flashNav.classList.add("hidden");
      return;
    }

    // Get FRESH DOM references every time
    const flashcard = document.getElementById("flashcard");
    const flashFront = document.getElementById("flashFront");
    const flashBack = document.getElementById("flashBack");
    const flashNav = document.getElementById("flashNav");
    const flashIndex = document.getElementById("flashIndex");

    if (!flashcard || !flashFront || !flashBack) {
      console.error('[FLASHCARD] DOM elements not found!', { flashcard, flashFront, flashBack });
      return;
    }

    flashcard.classList.remove("hidden");
    flashNav.classList.remove("hidden");

    const card = this.cards[this.index];
    console.log('[FLASHCARD] Rendering card', this.index, 'Total cards:', this.cards.length);
    console.log('[FLASHCARD] Card object:', card);

    if (!card) {
      console.error('[FLASHCARD] Card is null/undefined!');
      return;
    }

    const htmlFront = util.markdownToHtml(card.q);
    const htmlBack = util.markdownToHtml(card.a);
    
    console.log('[FLASHCARD] Setting innerHTML on freshly fetched element');
    flashFront.innerHTML = htmlFront;
    flashBack.innerHTML = htmlBack;

    console.log('[FLASHCARD] After setting innerHTML, flashFront is in DOM:', document.contains(flashFront));

    flashIndex.textContent = `${this.index + 1} / ${this.cards.length}`;

    // Render math on both sides of the card
    setTimeout(() => {
      ui.renderMathInElement(flashFront);
      ui.renderMathInElement(flashBack);
    }, 100);
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
 * 5. EVENT HANDLERY
 ****************************************************/

// GLOBAL STATE: Pending generate action
let pendingGenerateAction = null;

const events = {
    initTabs() {
    // If tabs don't exist yet, try to find them
    if (!DOM.tabs || DOM.tabs.length === 0) {
      DOM.tabs = document.querySelectorAll(".tab-btn");
      DOM.contents = document.querySelectorAll(".tab-content");
    }

    if (!DOM.tabs || DOM.tabs.length === 0) {
      console.log('No tab buttons found');
      return;
    }

    // Clear any existing listeners to avoid duplicates
    DOM.tabs.forEach((btn) => {
      if (btn && btn.parentNode) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });
    
    
    // Re-select tabs after cloning
    DOM.tabs = document.querySelectorAll(".tab-btn");
    DOM.contents = document.querySelectorAll(".tab-content");
    
    if (!DOM.tabs || DOM.tabs.length === 0) {
      console.log('No tab buttons found after cloning');
      return;
    }

    DOM.tabs.forEach((btn) => {
      if (!btn) return;
      
      btn.addEventListener("click", (e) => {
        if (!e) return;
        e.preventDefault();
        e.stopPropagation();
        
        // Remove active class from all tabs
        DOM.tabs.forEach((b) => {
          if (b) b.classList.remove("active");
        });
        
        // Hide all tab content
        if (DOM.contents) {
          DOM.contents.forEach((c) => {
            if (c) c.style.display = "none";
          });
        }

        // Show active tab and content
        btn.classList.add("active");
        const content = document.getElementById(btn.dataset.tab);
        if (content) {
          content.style.display = "flex";
          content.classList.add("active");
          
          // Render content for the tab
          if (btn.dataset.tab === "notes") ui.renderNotesGrid();
          if (btn.dataset.tab === "flashcards") ui.renderDeckGrid();
          if (btn.dataset.tab === "tests") ui.renderTestsGrid();
        }
      });
    });
  },

  initChat() {
    // Re-attach event listeners to avoid duplicates
    if (DOM.newThreadBtn) {
      DOM.newThreadBtn.replaceWith(DOM.newThreadBtn.cloneNode(true));
      DOM.newThreadBtn = document.getElementById("newThreadBtn");
      if (DOM.newThreadBtn) {
        DOM.newThreadBtn.addEventListener("click", async () => {
          const name = prompt("Název nového chatu:");
          if (!name) return;

          const newChat = await chatState.addChat(name);
          ui.updateSubjectSidebar();
          ui.renderSubjectsGrid();
          ui.renderThreads();
          if (newChat) chatState.selectChat(newChat.id);
        });
      }
    }

    // Re-attach other chat event listeners
    if (DOM.input) {
      DOM.input.replaceWith(DOM.input.cloneNode(true));
      DOM.input = document.getElementById("chatInput");
      if (DOM.input) {
        DOM.input.addEventListener("input", () => {
          util.autoResize(DOM.input);
        });
        DOM.input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            events.sendMessage();
          }
        });
      }
    }

    if (DOM.sendBtn) {
      DOM.sendBtn.replaceWith(DOM.sendBtn.cloneNode(true));
      DOM.sendBtn = document.getElementById("sendBtn");
      if (DOM.sendBtn) {
        DOM.sendBtn.addEventListener("click", events.sendMessage);
      }
    }

    if (DOM.plusBtn) {
      DOM.plusBtn.replaceWith(DOM.plusBtn.cloneNode(true));
      DOM.plusBtn = document.getElementById("chatPlusBtn");
      if (DOM.plusBtn) {
        DOM.plusBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          DOM.actionMenu.classList.toggle("hidden");
        });
      }
    }

    // Re-attach action menu listeners
    if (DOM.actionMenu) {
      DOM.actionMenu.replaceWith(DOM.actionMenu.cloneNode(true));
      DOM.actionMenu = document.getElementById("actionMenu");
      
      DOM.actionMenu.addEventListener("click", (e) => {
        const act = e.target.dataset.action;
        if (!act) return;

        // Files action is immediate (not pending)
        if (act === "files") {
          document.querySelector('.upload-card button').click();
          return;
        }

        // Handle generate actions (notes/flashcards/test)
        const btn = e.target;
        
        // Toggle: if already selected, deselect
        if (pendingGenerateAction === act) {
          pendingGenerateAction = null;
          btn.classList.remove("selected");
        } else {
          // Deselect previous button if any
          if (pendingGenerateAction) {
            const prevBtn = DOM.actionMenu.querySelector(`[data-action="${pendingGenerateAction}"]`);
            if (prevBtn) prevBtn.classList.remove("selected");
          }
          
          // Select new action
          pendingGenerateAction = act;
          btn.classList.add("selected");
        }
      });
    }

    // Global click to close action menu
    document.removeEventListener("click", events.closeActionMenu);
    document.addEventListener("click", events.closeActionMenu);
  },

  closeActionMenu() {
    if (DOM.actionMenu) {
      DOM.actionMenu.classList.add("hidden");
    }
  },

  initSidebar() {
    const sidebar = document.querySelector('.sidebar');

    if (!sidebar || !DOM.hamburgerBtn || !DOM.userAvatar) return;

    DOM.hamburgerBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    // This single listener handles both expanding the sidebar and opening the modal.
    DOM.userAvatar.addEventListener('click', () => {
      if (sidebar.classList.contains('collapsed')) {
        // If sidebar is collapsed, just expand it.
        sidebar.classList.remove('collapsed');
      } else {
        // If sidebar is already expanded, open the settings modal.
        if (DOM.settingsModal) {
          DOM.settingsModal.classList.remove('hidden');
        }
      }
    });
  },

  initSubjects() {
    if (!DOM.newSubjectBtn || !DOM.subjectList) return;

    DOM.newSubjectBtn.addEventListener("click", () => {
      const name = prompt("Název nového předmětu:");
      if (name) {
        subjectState.addSubject(name); // Tato funkce je teď asynchronní
      }
    });
  },

  initSubjectsOverview() {
    if (DOM.newSubjectOverviewBtn) {
      DOM.newSubjectOverviewBtn.addEventListener("click", () => {
        const name = prompt("Název nového předmětu:");
        if (name) {
          subjectState.addSubject(name).then(() => {
            ui.renderSubjectsGrid();
          });
        }
      });
    } else {
      console.log('New subject overview button not found');
    }

    if (DOM.backToSubjects) {
      DOM.backToSubjects.addEventListener("click", () => {
        ui.showSubjectsOverview();
      });
    }

    if (DOM.deleteSubjectBtn) {
      DOM.deleteSubjectBtn.addEventListener("click", () => {
        const subject = subjectState.getActiveSubject();
        if (!subject) return;

        if (confirm(`Opravdu chcete smazat předmět "${subject.name}"?`)) {
          const token = localStorage.getItem('authToken');
          fetch(`/api/subjects/${subject.id}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
          }).then(res => {
            if (!res.ok) throw new Error('Smazání selhalo');

            subjectState.subjects = subjectState.subjects.filter(s => s.id !== subject.id);
            ui.showSubjectsOverview();
            ui.renderSubjectsGrid();
          }).catch(err => alert(err.message));
        }
      });
    }
  },

  async sendMessage() {
    const text = DOM.input.value.trim();
    if (!text) return;

    ui.addMessage(text, "user");

    DOM.input.value = "";
    util.autoResize(DOM.input);

    // If a generate action is pending, execute it now
      if (pendingGenerateAction) {
        const action = pendingGenerateAction;
        pendingGenerateAction = null;
        
        // Clear visual selection
        const btn = DOM.actionMenu.querySelector(`[data-action="${action}"]`);
        if (btn) btn.classList.remove("selected");

        // Execute the pending action
        if (action === "notes") await events.generateNotes();
        if (action === "flashcards") await events.generateFlashcards();
        if (action === "test") await events.generateTest();
      }else {
        try {
              ui.addMessage("Pracuji na vaší odpovědi<span class='typing_dots'></span>", "assistant");
              
              const ctx = api.getContextMessages();
              const reply = await api.askAI(ctx);
              
              const chat = chatState.getCurrent();
              chat.messages[chat.messages.length - 1].content = reply;

              ui.renderMessages();
              await subjectState.saveActiveSubject();

              

            } catch (err) {
              ui.addMessage("⚠️ Chyba serveru: " + err.message, "assistant");
            }
      }

    
  },

  initFileUpload() {
  if (DOM.upload) {
    DOM.upload.replaceWith(DOM.upload.cloneNode(true));
    DOM.upload = document.getElementById("fileUpload");
    if (DOM.upload) {
      DOM.upload.addEventListener("change", async (e) => {
        const files = e.target.files;
        if (!files.length) return;

        ui.showFileProcessingLoader("Zpracovávám soubor...");

        for (const file of files) {
          try {
            const content = await ui.readFileData(file); 
            
            const fileData = {
              id: util.genId(),
              name: file.name,
              content: content,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString()
            };
            await fileState.addFile(fileData);
          } catch (error) {
            alert(`Chyba při nahrávání souboru ${file.name}: ${error.message}`);
          }
        }
        ui.renderFiles();
      });
    }
  }
},

  /* GENERATE NOTES */
  async generateNotes() {
    const chat = chatState.getCurrent();
    if (!chat) { ui.renderMessages(); return; }
    const topic = chat.name;

    ui.addMessage("📝 Generuji výpisky<span class='typing_dots'></span>\nBudete přepnuti na záložku notes.", "assistant");

    // Get custom instruction from last user message (if any)
    const lastMessage = chat.messages[chat.messages.length - 1];
    const customInstruction = lastMessage?.role === "user" ? lastMessage.content : "";

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

    // Conditionally add formula instruction for math-related subjects
    const subject = subjectState.getActiveSubject();
    const isMathSubject = subject && ['math', 'matematika', 'matika'].some(k => subject.name.toLowerCase().includes(k));
    const formulaInstruction = isMathSubject ? "vzorce (KaTeX), " : "";

    const prompt = `
      ${levelText}
      Vytvoř přehledné, strukturované a kvalitní výpisky k tématu **${topic}**.
      ${customInstruction ? `Uživatelova instrukce: ${customInstruction}\n\n` : ""}
      Vycházej z předchozí konverzace a souborů.

      DŮLEŽITÉ PRAVIDLO FORMÁTOVÁNÍ:
      1. Nepoužívej Markdown nadpisy (nepiš znaky #, ##, ###).
      2. Strukturu dělej POUZE pomocí číslování a tučného písma.
      
      Vzor jak to má vypadat:
      **1. Hlavní nadpis**
      Text úvodu...
      **1.1 Podnadpis**
      Detailní text...
      **2. Další nadpis**
      
      Použij odrážky, vysvětlení a ${formulaInstruction}příklady.
    `;

    // Get the previous messages and add the new instruction at the end.
    const ctx = api.getContextMessages();
    const messagesForAI = [...ctx, { role: "user", content: prompt }];

    const reply = await api.askAI(messagesForAI);
    
    // Uložíme a počkáme na dokončení, než přepneme tab
    await chatState.addNotes(reply);
    ui.updateSubjectSidebar();
    ui.renderSubjectsGrid();
    
    document.querySelector('[data-tab="notes"]').click();
  },

  /* GENERATE FLASHCARDS */
  async generateFlashcards() {
    const chat = chatState.getCurrent();
    if (!chat) 
    { 
      ui.renderMessages(); 
      return; 
    }
    const topic = chat.name;

    ui.addMessage("🧠 Generuji flashcards<span class='typing_dots'></span>\nPo dokončení budete přepnuti na záložku flashcards.","assistant");

    // Get custom instruction from last user message (if any)
    const lastMessage = chat.messages[chat.messages.length - 1];
    const customInstruction = lastMessage?.role === "user" ? lastMessage.content : "";

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
      Tvým úkolem je vytvořit ideální počet flashcards pro téma "${topic}".
      ${customInstruction ? `Uživatelova instrukce: ${customInstruction}\n\n` : ""}

      Vrať flashcards v následujícím formátu:

      Front: Otázka
      Back: Odpověď
      ---
      Front: Otázka
      Back: Odpověď
      ---

      Maximálně 20 krátkých a konkrétních flashcards.
      `;

    const ctx = api.getContextMessages();
    const messagesForAI = [...ctx, { role: "user", content: prompt }];

    // === AI CALL ===
    const aiResponse = await api.askAI(messagesForAI);

    // === BEZPEČNÁ EXTRAKCE TEXTU ===
    let reply = "";

    if (typeof aiResponse === "string") {
      reply = aiResponse;
    } else if (
      aiResponse?.candidates?.[0]?.content?.parts &&
      Array.isArray(aiResponse.candidates[0].content.parts)
    ) {
      reply = aiResponse.candidates[0].content.parts
        .map(p => p.text || "")
        .join("")
        .trim();
    }

    if (!reply) {
      throw new Error("AI nevrátila žádný textový výstup.");
    }

    if (
      reply.includes("error") ||
      reply.includes("503") ||
      reply.includes("unavailable") ||
      reply.includes("overloaded")
    ) {
      throw new Error("API je momentálně přetížené, zkuste to prosím později.");
    }

    // === CLEAN OUTPUT ===
    const cleanReply = reply
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let cards = [];

    // === PARSE TEXT ===
    const blocks = cleanReply.split(/---/).map(b => b.trim()).filter(b => b);
    cards = blocks.map(block => {
      const lines = block.split('\n').map(l => l.trim());
      const frontLine = lines.find(l => l.startsWith('Front:'));
      const backLine = lines.find(l => l.startsWith('Back:'));
      const q = frontLine ? frontLine.substring(6).trim() : '';
      const a = backLine ? backLine.substring(5).trim() : '';
      if (!q || !a) return null;
      return { q, a };
    }).filter(Boolean);

    if (!cards.length) {
      console.error("AI OUTPUT:", cleanReply);
      throw new Error("Nepodařilo se převést AI odpověď na flashcards.");
    }

    // === ULOŽENÍ - MUSÍME POČKAT! ===
    await chatState.addFlashcards(cards);

    // === UI - AŽ POTÉ! ===
    ui.updateSubjectSidebar();
    ui.renderSubjectsGrid();
    document.querySelector('[data-tab="flashcards"]').click();
    ui.openDeckDetail(chat.id);
  },

  /* GENERATE TEST */
  async generateTest() {
    const chat = chatState.getCurrent();
    if (!chat) return;
    const topic = chat.name;

    ui.addMessage("🧪 Generuji test<span class='typing_dots'></span>\nBudete přepnuti na záložku tests.", "assistant");

    // Get custom instruction from last user message (if any)
    const lastMessage = chat.messages[chat.messages.length - 1];
    const customInstruction = lastMessage?.role === "user" ? lastMessage.content : "";

    let levelText = "";
    if (window.quizmateLevel === "stredni") levelText = "pro středoškoláky";
    else if (window.quizmateLevel === "vysoka") levelText = "pro vysokoškoláky";
    else levelText = "pro žáky základní školy";

    // UPRAVENÝ PROMPT S ODDĚLOVAČEM
    const prompt = `
      Jsi expert na tvorbu multiple-choice testů. Vytvoř test s ideálním počtem otázek (min 5, max 10) ${levelText} k tématu "${topic}".
      ${customInstruction ? `Uživatelova instrukce: ${customInstruction}\n\n` : ""}
      
      DŮLEŽITÉ: Mezi každou otázku vlož oddělovač: ---NEXT---
      
      Formát každé otázky:
      Q: Text otázky
      Options: A) možnost1 B) možnost2 C) možnost3 D) možnost4
      A: správná odpověď (celý text odpovědi)

      Příklad:
      Q: Kolik je 2+2?
      Options: A) 3 B) 4 C) 5 D) 6
      A: 4
      ---NEXT---
      Q: Další otázka...
    `;

    const ctx = api.getContextMessages();
    const messagesForAI = [...ctx, { role: "user", content: prompt }];

    try {
      const reply = await api.askAI(messagesForAI);

      if (reply.includes("error") || reply.includes("503")) {
        throw new Error("API is overloaded.");
      }
      
      const cleanReply = reply.replace(/```[\s\S]*?```/g, '').replace(/```\w*\n?/g, '').trim();

      const questions = [];
      
      // Dělíme podle oddělovače ---NEXT---
      const blocks = cleanReply.split(/---NEXT---/i).filter(block => block.trim());

      for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        
        const qLine = lines.find(l => l.match(/^Q:/i));
        const optionsLine = lines.find(l => l.match(/^Options:/i));
        const aLine = lines.find(l => l.match(/^A:/i));

        if (!qLine || !optionsLine || !aLine) continue;

        const text = qLine.replace(/^Q:\s*/i, '').trim();
        const optionsStr = optionsLine.replace(/^Options:\s*/i, '').trim();
        
        // Robustnější rozdělení možností
        let options = optionsStr.split(/\s[A-D]\)\s/).filter(opt => opt.trim());
        // Fix pro první možnost A), která může zůstat přilepená
        if (options.length === 1 && options[0].includes("B)")) {
             const parts = optionsStr.split(/[A-D]\)/).filter(p => p.trim());
             if (parts.length >= 2) options = parts;
        } else if (optionsStr.includes("A)")) {
             // Fallback split
             const parts = optionsStr.split(/[A-D]\)/).filter(p => p.trim());
             if (parts.length >= 2) options = parts;
        }
        
        const correctAnswer = aLine.replace(/^A:\s*/i, '').trim();

        if (options.length >= 2 && correctAnswer) {
          questions.push({ text, options, correctAnswer });
        }
      }

      if (questions.length === 0) {
        console.error("RAW AI REPLY:", cleanReply);
        throw new Error("Nepodařilo se naparsovat žádné otázky. AI nevrátila správný formát.");
      }

      await chatState.addTest({ questions });
      ui.updateSubjectSidebar();
      ui.renderSubjectsGrid();
      
      const testsTab = document.querySelector('[data-tab="tests"]');
      if(testsTab) testsTab.click();
      
      ui.openTestDetail(chat.id);

    } catch (error) {
      console.error("Chyba při generování testu:", error);
      ui.addMessage(`⚠️ Nepodařilo se vygenerovat test: ${error.message}`, "assistant");
    }
  },

  submitTest(chatId) {
    const activeSubject = subjectState.getActiveSubject();
    if (!activeSubject || !activeSubject.chats) return;
    
    const chat = activeSubject.chats.find(c => c.id === chatId);
    if (!chat || !chat.tests || chat.tests.length === 0) return;
    
    const test = chat.tests[0];
    let score = 0;

    test.questions.forEach((q, index) => {
      const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
      const feedbackEl = document.querySelectorAll('.result-feedback')[index];

      if (selectedOption) {
        // OPRAVA: Používáme .trim() pro odstranění mezer, které AI občas přidá
        const userChoice = selectedOption.value.trim();
        const correctChoice = q.correctAnswer.trim();

        if (userChoice === correctChoice) {
          score++;
          feedbackEl.textContent = '✅ Správně!';
          feedbackEl.style.color = 'green';
        } else {
          feedbackEl.textContent = `❌ Špatně. Správná odpověď: ${q.correctAnswer}`;
          feedbackEl.style.color = 'red';
        }
      } else {
        feedbackEl.textContent = `⚠️ Nebyla vybrána žádná odpověď. Správně: ${q.correctAnswer}`;
        feedbackEl.style.color = 'orange';
      }
    });

    const submitBtn = document.getElementById('submitTestBtn');
    if (submitBtn) submitBtn.disabled = true;
    
    if (DOM.testDetailTitle) {
      DOM.testDetailTitle.textContent = `Výsledek testu: ${score} / ${test.questions.length}`;
    }
  },

  async createStandaloneNotes() {
    const topic = prompt("Zadejte téma pro výpisky:");
    if (!topic) return;

    // Create a new chat for this topic
    await chatState.addChat(topic);
    const newChat = subjectState.getActiveSubject().chats[0];
    chatState.selectChat(newChat.id);

    // Generate notes
    await events.generateNotes();

    // Switch to notes tab
    document.querySelector('[data-tab="notes"]').click();
  },

  async createStandaloneFlashcards() {
    const topic = prompt("Zadejte téma pro flashcards:");
    if (!topic) return;

    // Create a new chat for this topic
    await chatState.addChat(topic);
    const newChat = subjectState.getActiveSubject().chats[0];
    chatState.selectChat(newChat.id);

    // Generate flashcards
    await events.generateFlashcards();

    // Switch to flashcards tab
    document.querySelector('[data-tab="flashcards"]').click();
  },

  async createStandaloneTest() {
    const topic = prompt("Zadejte téma pro test:");
    if (!topic) return;

    // Create a new chat for this topic
    await chatState.addChat(topic);
    const newChat = subjectState.getActiveSubject().chats[0];
    chatState.selectChat(newChat.id);

    // Generate test
    await events.generateTest();

    // Switch to tests tab
    document.querySelector('[data-tab="tests"]').click();
  },

  initFlashcards() {
    // Re-attach flashcard event listeners
    if (DOM.flashcard) {
      DOM.flashcard.replaceWith(DOM.flashcard.cloneNode(true));
      DOM.flashcard = document.getElementById("flashcard");
      if (DOM.flashcard) {
        DOM.flashcard.addEventListener("click", () => {
          DOM.flashcard.classList.toggle("flipped");
        });
      }
    }

    if (DOM.nextFlash) {
      DOM.nextFlash.replaceWith(DOM.nextFlash.cloneNode(true));
      DOM.nextFlash = document.getElementById("nextFlash");
      if (DOM.nextFlash) {
        DOM.nextFlash.addEventListener("click", () => flashcards.next());
      }
    }

    if (DOM.prevFlash) {
      DOM.prevFlash.replaceWith(DOM.prevFlash.cloneNode(true));
      DOM.prevFlash = document.getElementById("prevFlash");
      if (DOM.prevFlash) {
        DOM.prevFlash.addEventListener("click", () => flashcards.prev());
      }
    }

    if (DOM.newFlashcardBtn) {
      DOM.newFlashcardBtn.replaceWith(DOM.newFlashcardBtn.cloneNode(true));
      DOM.newFlashcardBtn = document.getElementById("newFlashcardBtn");
      if (DOM.newFlashcardBtn) {
        DOM.newFlashcardBtn.addEventListener("click", events.createStandaloneFlashcards);
      }
    }
  },

  initNotes() {
    if (DOM.newNoteBtn) {
      DOM.newNoteBtn.replaceWith(DOM.newNoteBtn.cloneNode(true));
      DOM.newNoteBtn = document.getElementById("newNoteBtn");
      if (DOM.newNoteBtn) {
        DOM.newNoteBtn.addEventListener("click", events.createStandaloneNotes);
      }
    }
  },

  initTests() {
    if (DOM.newTestBtn) {
      DOM.newTestBtn.replaceWith(DOM.newTestBtn.cloneNode(true));
      DOM.newTestBtn = document.getElementById("newTestBtn");
      if (DOM.newTestBtn) {
        DOM.newTestBtn.addEventListener("click", events.createStandaloneTest);
      }
    }
  },

  initSettingsModal() {
  if (!DOM.settingsModal) return;

  function closeSettingsModal() {
    DOM.settingsModal.classList.add('hidden');
    passwordForm.classList.add("hidden");
    passwordForm.reset();
  }

  // === CLOSE MODAL ===
  if (DOM.closeModalButton) {
    DOM.closeModalButton.addEventListener('click', closeSettingsModal);
  }

  // Close modal when clicking on overlay
  DOM.settingsModal.addEventListener('click', (event) => {
    if (event.target === DOM.settingsModal) {
      closeSettingsModal();
    }
  });

  // === LOGOUT ===
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("quizmate_current_user");
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    });
  }

  // === CHANGE USERNAME ===
  const changeUsernameBtn = document.getElementById("changeUsernameBtn");
  if (changeUsernameBtn) {
    changeUsernameBtn.addEventListener("click", async () => {
      const newUsername = prompt("Enter new username:");
      if (!newUsername) return;

      const token = localStorage.getItem("authToken");

      try {
        const res = await fetch("/api/user/username", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
          body: JSON.stringify({ newUsername }),
        });

        if (res.status === 404) {
          throw new Error("Endpoint /api/user/username not found. Please check server.js registration.");
        }

        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          throw new Error(`Server error: ${res.status} - ${text.substring(0, 50)}...`);
        }

        if (!res.ok) throw new Error(data.msg || "Failed to change username");

        // update localStorage + UI
        const user = JSON.parse(localStorage.getItem("quizmate_current_user"));
        user.username = data.username;
        localStorage.setItem("quizmate_current_user", JSON.stringify(user));

        // Aktualizace UI - zkusíme DOM.userName, případně najdeme element znovu
        if (DOM.userName) {
          DOM.userName.textContent = data.username;
        } else {
          const userNameEl = document.getElementById("userName");
          if (userNameEl) userNameEl.textContent = data.username;
        }

        alert("Username changed");
        closeSettingsModal();
      } catch (err) {
        console.error(err);
        alert(err.message);
      }
    });
  }

  // === PASSWORD FORM ELEMENTS ===
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const passwordForm = document.getElementById("changePasswordForm");
  const oldPasswordInput = document.getElementById("oldPasswordInput");
  const newPasswordInput = document.getElementById("newPasswordInput");
  const cancelBtn = document.getElementById("cancelPasswordChange");

  if (!changePasswordBtn || !passwordForm) return;

  // Fix: Add autocomplete attributes to silence browser warnings
  if (oldPasswordInput) {
    oldPasswordInput.setAttribute("autocomplete", "current-password");
    oldPasswordInput.setAttribute("name", "current-password");
  }
  if (newPasswordInput) {
    newPasswordInput.setAttribute("autocomplete", "new-password");
    newPasswordInput.setAttribute("name", "new-password");
  }

  // === OPEN FORM ===
  changePasswordBtn.addEventListener("click", () => {
    passwordForm.classList.toggle("hidden");
    oldPasswordInput.focus();
  });

  // === CANCEL ===
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      passwordForm.classList.add("hidden");
      passwordForm.reset();
    });
  }

  // === SUBMIT ===
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const oldPassword = oldPasswordInput.value;
    const newPassword = newPasswordInput.value;

    if (!oldPassword || !newPassword) return;

    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`Server error: ${res.status} (Endpoint likely missing)`);
      }

      if (!res.ok) {
        alert(data.msg || "Password change failed");
        return;
      }

      alert("Password changed successfully");
      closeSettingsModal();

    } catch (err) {
      alert("Server error: " + err.message);
      console.error(err);
    }
  });

  // === CHANGE AVATAR ===
  const changeAvatarBtn = document.getElementById("changeAvatarBtn");
  const avatarForm = document.getElementById("changeAvatarForm");
  const saveAvatarBtn = document.getElementById("saveAvatarBtn");
  const cancelAvatarBtn = document.getElementById("cancelAvatarBtn");
  const avatarFile = document.getElementById("avatarFile");
  const avatarPreview = document.getElementById("avatarPreview");
  const avatarText = document.getElementById("avatarText");

  let uploadedAvatarBase64 = null;

  if (avatarFile) {
    avatarFile.addEventListener("change", () => {
      const file = avatarFile.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedAvatarBase64 = e.target.result;

        // Preview
        if (avatarPreview) {
          avatarPreview.src = uploadedAvatarBase64;
          avatarPreview.classList.remove("hidden");
        }

        // Clear text avatar if any
        if (avatarText) avatarText.value = "";
      };
      reader.readAsDataURL(file);
    });
  }

  // Reset image when typing text
  if (avatarText) {
    avatarText.addEventListener("input", () => {
      if (avatarText.value.trim() !== "") {
        uploadedAvatarBase64 = null;
        if (avatarFile) avatarFile.value = "";
        if (avatarPreview) {
          avatarPreview.classList.add("hidden");
          avatarPreview.src = "";
        }
      }
    });
  }

  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener("click", () => {
      if (avatarForm) avatarForm.classList.toggle("hidden");
    });
  }

  if (cancelAvatarBtn) {
    cancelAvatarBtn.addEventListener("click", () => {
      if (avatarForm) avatarForm.classList.add("hidden");
      uploadedAvatarBase64 = null;
      if (avatarFile) avatarFile.value = "";
      if (avatarText) avatarText.value = "";
      if (avatarPreview) {
        avatarPreview.classList.add("hidden");
        avatarPreview.src = "";
      }
    });
  }

  if (saveAvatarBtn) {
    saveAvatarBtn.addEventListener("click", async (e) => {
      if (e) e.preventDefault();
      const token = localStorage.getItem("authToken");
      let avatar = uploadedAvatarBase64;
      
      if (!avatar && avatarText) {
        avatar = avatarText.value.trim();
      }

      if (!avatar) return alert("Vyberte obrázek nebo zadejte text.");

      try {
        const res = await fetch("/api/user/avatar", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
          body: JSON.stringify({ avatar }),
        });

        let data;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        } else {
          throw new Error(`Server error: ${res.status} (Endpoint likely missing)`);
        }

        if (!res.ok) throw new Error(data.msg || "Chyba při změně avataru");

        // Update LocalStorage
        const user = JSON.parse(localStorage.getItem("quizmate_current_user"));
        user.avatar = data.avatar;
        localStorage.setItem("quizmate_current_user", JSON.stringify(user));

        // Update UI
        if (DOM.userAvatar) {
          if (data.avatar.startsWith("data:image")) {
            DOM.userAvatar.style.backgroundImage = `url(${data.avatar})`;
            DOM.userAvatar.style.backgroundSize = "cover";
            DOM.userAvatar.style.backgroundPosition = "center";
            DOM.userAvatar.textContent = "";
          } else {
            DOM.userAvatar.style.backgroundImage = "";
            DOM.userAvatar.textContent = data.avatar;
          }
        }

        alert("Avatar úspěšně změněn");
        if (avatarForm) avatarForm.classList.add("hidden");
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Change level of study
  const levelSelect = document.getElementById("levelSelect");

  if (levelSelect) {
    // 1. Načtení aktuální hodnoty z localStorage při otevření modalu
    const user = JSON.parse(localStorage.getItem("quizmate_current_user") || "{}");
    if (user.level) {
        levelSelect.value = user.level;
        window.quizmateLevel = user.level; // Nastavení globální proměnné
    }

    // 2. Uložení při změně
    levelSelect.addEventListener("change", () => {
        const newLevel = levelSelect.value;
        
        // Aktualizace v objektu uživatele
        const user = JSON.parse(localStorage.getItem("quizmate_current_user") || "{}");
        user.level = newLevel;
        localStorage.setItem("quizmate_current_user", JSON.stringify(user));
        
        // Důležité: aktualizace globální proměnné, kterou používá AI pro generování
        window.quizmateLevel = newLevel; 
        
        console.log("Level updated to:", newLevel);
        
        // Volitelně: vizuální zpětná vazba (dočasná změna barvy okraje)
        levelSelect.style.borderColor = "var(--primary-1)";
        setTimeout(() => levelSelect.style.borderColor = "var(--border)", 1000);
    });
  }
}
};




/****************************************************
 * 6. INICIALIZACE APLIKACE (DOMContentLoaded / init)
 ****************************************************/
document.addEventListener("DOMContentLoaded", async () => {

  // Load user data
  const user = JSON.parse(localStorage.getItem("quizmate_current_user") || "null");

  // Redirect if not logged in
  if (!user || !user.username) {
    window.location.href = "/login";
    return; // STOP running initialization
  }

  // Initialize DOM FIRST so elements exist
  DOM.init();

  // Ensure sidebar is expanded by default
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.remove('collapsed');
  }

  // Now we can safely apply user info
  if (DOM.userName) DOM.userName.textContent = user.username;

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
  await subjectState.init(); // Počkáme, až se předměty načtou ze serveru
  chatState.init(user.username);

  // Show subjects overview by default
  ui.showSubjectsOverview();
  ui.renderSubjectsGrid();

  events.initTabs();
  events.initChat();
  events.initFlashcards();
  events.initNotes();
  events.initTests();
  events.initSidebar();
  events.initFileUpload();
  events.initSubjects();
  events.initSubjectsOverview();
  events.initSettingsModal();

  // Subject detail content will be rendered when a subject is selected

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

  // Back button for tests
  if (DOM.backToTests) {
    DOM.backToTests.addEventListener("click", () => {
      ui.renderTestsGrid();
    });
  }

  // Logout button
  if (DOM.logoutBtn) {
    DOM.logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("quizmate_current_user");
      localStorage.removeItem("authToken"); // Smažeme i token
      window.location.href = "/login";
    });
  }
});