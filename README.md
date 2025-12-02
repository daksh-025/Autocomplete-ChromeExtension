# Universal Autocomplete Assistant (Chrome Extension)

**What it does**
- Injects an inline autocomplete suggestion box into text inputs, textareas, and contenteditable fields across the web.
- Shows suggestions based on a built-in list (editable from the extension popup).
- Accept a suggestion by pressing **Tab** or **Enter** (when highlighted), or by clicking a suggestion.

**How to install (developer mode)**
1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the `Extension Name` folder (the one you downloaded).

**Notes & limitations**
- This is a minimal, privacy-friendly prototype. Suggestions are stored in `chrome.storage.sync`.
- The content script runs on all pages; if you want to restrict it, update `manifest.json` `content_scripts.matches`.
- In contenteditable elements, insertion attempts to place text at the caret but behavior may vary across complex editors (Gmail, Google Docs) — those may require custom integrations.

**Files included**
- `manifest.json` - extension manifest (MV3)
- `background.js` - service worker for settings & defaults
- `content.js` - core content script that provides suggestions
- `popup.html`, `popup.js` - UI to edit suggestion list
- `README.md` - this file

