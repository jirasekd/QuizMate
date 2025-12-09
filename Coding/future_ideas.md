# Budoucí Nápady & Stav Projektu

Tento dokument shrnuje hotové funkce a možné nápady na budoucí rozšíření aplikace QuizMate.

---

### ✅ Hotové Funkce (Splněno)

- **[x] Backend a Databáze:** Aplikace běží na vlastním Node.js/Express serveru a všechna data ukládá do online databáze MongoDB.
- **[x] Autentizace a Autorizace:** Implementován kompletní systém registrace a přihlašování. Každý uživatel vidí pouze svá vlastní data.
- **[x] Bezpečné Ukládání Hesel:** Hesla jsou v databázi bezpečně šifrována pomocí `bcryptjs`.
- **[x] Přenositelnost Dat:** Uživatel se může přihlásit z jakéhokoliv zařízení (PC, mobil, tablet) a uvidí svá aktuální data.
- **[x] Správa Předmětů a Chatů:** Uživatelé si mohou vytvářet a spravovat vlastní předměty a konverzační vlákna.
- **[x] Integrace AI (Gemini):** Aplikace je napojena na Gemini API pro generování obsahu.
- **[x] Generování Výpisků:** Funkce pro automatické vytvoření strukturovaných poznámek z konverzace.
- **[x] Generování Flashcards:** Funkce pro automatické vytvoření sady kartiček (otázka/odpověď) k danému tématu.
- **[x] Generování Testů:** Funkce pro automatické vytvoření multiple-choice testu s následným vyhodnocením.
- **[x] Nasazení (Deployment):** Aplikace je nasazena na cloudové platformě Render a je veřejně dostupná.

---

### 🚀 Možná Budoucí Vylepšení (Není Nutné pro Maturitu)

- **[ ] Dvoufázové Odpovědi AI:** Zlepšit uživatelský zážitek tím, že AI nejprve pošle rychlé, stručné shrnutí a teprve poté na pozadí vygeneruje a uloží detailní popis (např. do poznámek).
- **[ ] Vylepšení Nahrávání Souborů:** Implementovat ukládání nahraných souborů přímo na server nebo do cloudového úložiště (např. AWS S3, Cloudinary), aby byly také dostupné z více zařízení.
- **[ ] Zlepšení Responzivního Designu:** Optimalizovat CSS layout pro lepší zobrazení a použitelnost na mobilních telefonech a tabletech (využití media queries).
- **[ ] Refaktorizace Kódu:** Rozdělit velké soubory (`main.js`, `style.css`) na menší, logické moduly pro lepší přehlednost a údržbu.
- **[ ] Notifikace:** Přidat systém upozornění (např. "Poznámky byly úspěšně vygenerovány").
- **[ ] Sdílení Obsahu:** Umožnit uživatelům sdílet své výpisky nebo flashcards s ostatními.
- **[ ] Audiokonverzace:** Umožní uživateli poslouchat umělou inteligenci jak vykládá o tématu s možností se ptát na otáazky v průběhu výkladu.