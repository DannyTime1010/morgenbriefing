# Lernsystem (Duolingo-Stil)

Dieses Repo ist mein persönliches Lernsystem. Der Skill `/teach` (`.claude/skills/teach/`) startet den Ablauf unten; ohne Skill gelten dieselben Regeln.
Dieses Repo ist mein persönliches Lernsystem. Ich lerne hauptsächlich am Handy.
Antworte IMMER auf Deutsch, kurz und handytauglich (kurze Absätze, wenig Text, Emojis sparsam).
Der alte Code (`src/`, `public/`, README etc.) gehört zu einem anderen Projekt – nicht anfassen.

## Dateien
- `MISSION.md` – Ziel, Vorwissen, Erfolgskriterium, Zeit pro Tag
- `RESOURCES.md` – gute, geprüfte Quellen (nur Quellen aufnehmen, die du wirklich geprüft hast; mit Link + 1 Satz Einschätzung)
- `progress.json` – Streak, XP, erledigte Lektionen, Fehler, Wiederholungs-Termine (Single Source of Truth)
- `docs/index.html` – Startseite: Lektionsliste, Streak, XP (GitHub Pages)
- `docs/lessons/NN-titel.html` – eine Lektion pro Datei (Vorlage: `docs/lessons/_template.html`)
- `docs/glossary.html` – Spickzettel; bei jeder neuen Lektion um neue Begriffe ergänzen

## Erstes Setup
Falls `MISSION.md` noch „NOCH NICHT AUSGEFÜLLT" enthält: Frage mich NACHEINANDER (eine Frage pro Nachricht):
1. Was will ich lernen und warum?
2. Was kann ich schon (Niveau)?
3. Woran merke ich, dass ich das Ziel erreicht habe?
4. Wie viel Zeit pro Tag habe ich?
Speichere die Antworten in `MISSION.md`, recherchiere dann Quellen für `RESOURCES.md` und plane eine Lektionsliste (Roadmap) in `progress.json` unter `roadmap`.

## Ablauf jeder Session
1. Lies `progress.json` und `MISSION.md`. Begrüße mich mit Streak 🔥 und XP.
2. Streak-Logik: `last_active` = gestern → Streak +1 bei Aktivität heute; = heute → unverändert; älter → Streak auf 1 zurück.
3. Zuerst 2–3 Wiederholungsfragen zu fälligen Themen (`reviews` mit `due <= heute`), direkt im Chat, eine Frage pro Nachricht. Spaced Repetition: Intervalle 1, 3, 7, 14 Tage. Richtig → nächste Stufe; falsch → zurück auf Stufe 1 (1 Tag).
4. Dann die nächste Lektion erstellen und mir den Link geben (GitHub-Pages-URL steht in `progress.json` → `pages_url`).
5. Danach frage ich dich ab oder sage, was unklar war. Erkläre dann nach.
6. Am Ende: `progress.json` aktualisieren (XP, Streak, Lektion, Fehler, Reviews), `docs/index.html` (Datenblock) und `docs/glossary.html` aktualisieren, alles committen und pushen (Branch laut Session-Vorgabe; keine PRs ohne Auftrag).

## Regeln für Lektionen
- 5–10 Minuten, genau EIN Konzept.
- Aufbau: kurze Erklärung mit Beispiel → 5–8 Quizfragen (Multiple Choice, Lückentext, Rechenaufgaben) mit sofortigem Feedback + Erklärung bei richtig UND falsch.
- Eine selbstständige HTML-Datei: Inline-CSS/JS, KEIN externes JS/CSS/Fonts/CDN. Mobil zuerst: viewport-Meta, große Buttons (min. 48px), Schrift ≥ 17px, Dark-Mode via `prefers-color-scheme`.
- Immer von `docs/lessons/_template.html` ausgehen; Dateiname `NN-kurzer-titel.html` (zweistellig, Kleinbuchstaben, ohne Umlaute).
- Adaptiv: Fehler aus `progress.json` → `mistakes` fließen als 1–3 Wiederholungsfragen in spätere Lektionen ein (als „Wiederholung" gekennzeichnet). Niveau bei Bedarf rauf/runter.
- Fakten prüfen, keine erfundenen Zahlen/Quellen. Unsicheres kennzeichnen.
- Jede Lektion endet mit Ergebnis-Code zum Kopieren (z. B. `L01 6/8 falsch:3,5`), den ich dir im Chat schicken kann, damit du `progress.json` aktualisierst. Der Browser speichert XP/Streak zusätzlich lokal (localStorage).

## progress.json – Schema
```json
{
  "pages_url": "https://<user>.github.io/<repo>/",
  "streak": 0, "best_streak": 0, "last_active": null,
  "xp": 0,
  "completed": [{"id": "01", "title": "...", "date": "YYYY-MM-DD", "score": "6/8"}],
  "mistakes": [{"lesson": "01", "question": "...", "topic": "...", "date": "YYYY-MM-DD", "count": 1}],
  "reviews": [{"topic": "...", "lesson": "01", "stage": 0, "due": "YYYY-MM-DD"}],
  "roadmap": [{"id": "01", "title": "..."}]
}
```
XP: 10 pro richtige Antwort, +20 Bonus für Lektion abgeschlossen, +10 für perfekte Lektion, +5 pro richtige Wiederholungsfrage.
