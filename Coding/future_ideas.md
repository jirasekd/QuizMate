# Nápady na budoucí vylepšení QuizMate

Tento dokument slouží jako zásobník nápadů a přehled dokončených úkolů.

## ✅ Hotovo (Completed)

### Dark Mode (Tmavý režim)
- **Cíl:** Zpříjemnit používání aplikace v noci a snížit únavu očí.
- **Stav:** Hotovo. Přepínač motivu je v postranním panelu.

### Modální okno pro nastavení uživatele
- **Cíl:** Vyřešit překrývání tlačítek v zápatí postranního panelu a vytvořit centralizované místo pro uživatelská nastavení.
- **Stav:** Hotovo. Po kliknutí na avatar (pokud není panel sbalený) se zobrazí modální okno s tlačítky pro odhlášení a resetování dat.

---

## Fáze 1: Rychlá vylepšení UI/UX (Quick Wins)

*Tyto úkoly mají vysoký dopad na uživatelský zážitek a jsou relativně snadno implementovatelné.*

### Náhled a stažení souborů
- **Cíl:** Zobrazit obsah nahraného souboru přímo v aplikaci a umožnit jeho stažení.
- **Implementace:**
    - **Náhled:** Po kliknutí na název souboru v záložce "Files" otevřít modální okno (popup) s jeho textovým obsahem.
    - **Stažení:** Přidat vedle každého souboru ikonu pro stažení, která umožní uživateli uložit si originální soubor zpět do počítače.

### Export dat
- **Cíl:** Dát uživatelům kontrolu nad jejich daty a umožnit jim použití v jiných aplikacích.
- **Implementace:**
    - **Výpisky:** Tlačítko pro export do Markdown (`.md`) nebo PDF.
    - **Flashcards:** Tlačítko pro export do CSV pro import do aplikací jako Anki nebo Quizlet.

## Fáze 2: Klíčové funkční a strategické změny

*Tyto úkoly vyžadují více práce, ale přinášejí zásadní vylepšení pro uživatele a efektivitu aplikace.*

### Google Sign-In / Sign-Up
- **Cíl:** Zjednodušit přihlašování a registraci.
- **Výhody:**
    - Uživatelé se nemusí registrovat a pamatovat si další heslo.
    - Zvýšení důvěryhodnosti a profesionálního vzhledu.
- **Implementace:**
    - **Backend (`server.js`):** Použít knihovnu jako `passport-google-oauth20`.
    - **Frontend (`login.html`):** Přidat tlačítko "Sign in with Google".

### Fulltextové vyhledávání
- **Cíl:** Umožnit uživatelům rychle najít relevantní informace napříč jejich obsahem.
- **Implementace:** Přidat vyhledávací pole, které prohledá obsah všech výpisků, názvy chatů a případně i nahrané soubory v rámci aktivního předmětu.

### Použití různých AI modelů pro různé úkoly
- **Cíl:** Optimalizovat kvalitu odpovědí a náklady na provoz.
- **Příklad strategie:**
    - **Generování výpisků:** Silný a kreativní model (např. `GPT-4o`, `Gemini 1.5 Pro`).
    - **Generování testů:** Spolehlivý model pro dodržování JSON formátu (např. `Claude 3 Sonnet`).
    - **Běžný chat:** Rychlý a levný model pro okamžité odpovědi (např. `Gemini 1.5 Flash`).
- **Implementace:**
    - **Backend (`server.js`):** Vytvořit funkce pro volání různých API (OpenAI, Anthropic, Google).
    - **Frontend (`main.js`):** Při volání API posílat parametr `task_type` (např. `notes`, `test`), aby server věděl, kterou AI použít.

## Fáze 3: Pokročilé a inovativní funkce

*Jedná se o složité a náročné projekty, které mohou aplikaci výrazně odlišit od konkurence a posunout ji na další úroveň.*

### Interaktivní audio konverzace (Hlasový asistent)
- **Cíl:** Vytvořit plně interaktivní hlasový zážitek, kde AI "vykládá" látku a uživatel může kdykoliv pokládat doplňující otázky hlasem.
- **Složitost:** Vysoká.
- **Výhody:**
    - Maximálně poutavá a moderní forma učení.
    - Umožňuje hands-free učení, ideální na cesty nebo při jiné činnosti.
    - Simuluje reálný dialog s tutorem.
- **Implementace:**
    - **Frontend (`main.js`):**
        - **Speech-to-Text (STT):** Využít `Web Speech API` v prohlížeči pro převod mluveného slova uživatele na text.
        - **Řízení konverzace:** Spravovat stavy (AI mluví, AI naslouchá, uživatel mluví). Detekovat, kdy uživatel domluvil, a poslat transkripci na server.
        - **Přehrávání audia:** Přehrávat audio stream nebo soubory vrácené ze serveru.
    - **Backend (`server.js`):**
        - **Text-to-Speech (TTS):** Po vygenerování textové odpovědi od AI ji poslat do TTS API (např. OpenAI TTS) a vrátit klientovi audio.

---

## Fáze 4: Nasazení a Zabezpečení (Deployment & Security)

*Kroky potřebné k bezpečnému nasazení aplikace na internet a její ochraně.*

### Nasazení na produkční server (Deployment)
- **Cíl:** Zpřístupnit aplikaci online pro veřejné použití.
- **Doporučená služba:** Render (Platform as a Service).
- **Kroky:**
    1.  **Použít Git a GitHub:** Vytvořit repozitář a nahrát kód.
    2.  **Vytvořit `.gitignore`:** Ignorovat `node_modules` a `.env` soubory.
    3.  **Nasadit na Render:** Propojit GitHub, nastavit build command (`npm install`) a start command (`npm start`), a přidat environmentální proměnné (např. `GOOGLE_API_KEY`).

### Zabezpečení Aplikace (Security Hardening)
- **Cíl:** Opravit kritické bezpečnostní zranitelnosti před nasazením.
- **Klíčové problémy:**
    - **Autentizace na straně klienta:** Současný login systém v `localStorage` je snadno obejitelný.
        - **Riziko:** Neautorizovaný přístup a zneužití API klíče.
        - **Řešení:** Implementovat **server-side autentizaci** (např. pomocí sessions nebo JWT), kde server ověřuje každou chráněnou akci.
    - **Servírování celého adresáře:** `app.use(express.static(__dirname))` odhaluje zdrojový kód a citlivé soubory.
        - **Riziko:** Útočník si může stáhnout `server.js`, `package.json` atd.
        - **Řešení:** Vytvořit dedikovaný `public` adresář pro frontend soubory (`index.html`, `style.css`, `main.js`) a servírovat pouze ten.