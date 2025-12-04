# Nápady na budoucí vylepšení QuizMate

Tento dokument slouží jako zásobník nápadů na funkce a vylepšení, které můžeme implementovat později, až bude čas. Jsme v harmonogramu napřed, takže se můžeme zaměřit na "vyšperkování" aplikace.

## 1. Vylepšení autentizace a správy uživatelů

### Google Sign-In / Sign-Up
- **Cíl:** Zjednodušit přihlašování a registraci.
- **Výhody:**
    - Uživatelé se nemusí registrovat a pamatovat si další heslo.
    - Zvýšení důvěryhodnosti a profesionálního vzhledu.
    - Možnost automaticky načíst jméno a profilový obrázek.
- **Implementace:**
    - **Backend (`server.js`):** Použít knihovnu jako `passport-google-oauth20`.
    - **Frontend (`login.html`):** Přidat tlačítko "Sign in with Google".

## 2. Pokročilá strategie pro AI

### Použití různých AI modelů pro různé úkoly
- **Cíl:** Optimalizovat kvalitu odpovědí a náklady na provoz.
- **Příklad strategie:**
    - **Generování výpisků:** Silný a kreativní model (např. `GPT-4o`, `Gemini 1.5 Pro`).
    - **Generování testů:** Spolehlivý model pro dodržování JSON formátu (např. `Claude 3 Sonnet`).
    - **Běžný chat:** Rychlý a levný model pro okamžité odpovědi (např. `Gemini 2.5 Flash`).
- **Implementace:**
    - **Backend (`server.js`):** Vytvořit funkce pro volání různých API (OpenAI, Anthropic, Google).
    - **Frontend (`main.js`):** Při volání API posílat parametr `type` (např. `notes`, `test`), aby server věděl, kterou AI použít.
    - **Frontend (`main.js`):** Při volání API posílat parametr `task_type` (např. `notes`, `test`), aby server věděl, kterou AI použít.

### Interaktivní audio konverzace (Hlasový asistent)
- **Cíl:** Vytvořit plně interaktivní hlasový zážitek, kde AI "vykládá" látku a uživatel může kdykoliv pokládat doplňující otázky hlasem.
- **Výhody:**
    - Maximálně poutavá a moderní forma učení.
    - Umožňuje hands-free učení, ideální na cesty nebo při jiné činnosti.
    - Simuluje reálný dialog s tutorem.
- **Implementace (Vysoká složitost):**
    - **Frontend (`main.js`):**
        - **Speech-to-Text (STT):** Využít `Web Speech API` v prohlížeči pro převod mluveného slova uživatele na text.
        - **Řízení konverzace:** Spravovat stavy (AI mluví, AI naslouchá, uživatel mluví). Detekovat, kdy uživatel domluvil, a poslat transkripci na server.
        - **Přehrávání audia:** Přehrávat audio stream nebo soubory vrácené ze serveru.
    - **Backend (`server.js`):**
        - **Text-to-Speech (TTS):** Po vygenerování textové odpovědi od AI ji poslat do TTS API (např. OpenAI TTS) a vrátit klientovi audio.

## 3. Vylepšení UI/UX (Uživatelský zážitek)

### Dark Mode (Tmavý režim)
- **Cíl:** Zpříjemnit používání aplikace v noci.
- **Implementace:** Využít a rozšířit stávající CSS proměnné v `:root`.

### Fulltextové vyhledávání
- **Cíl:** Umožnit uživatelům rychle najít relevantní informace.
- **Implementace:** Přidat vyhledávací pole, které prohledá obsah všech výpisků, názvy chatů a případně i nahrané soubory v rámci aktivního předmětu.

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