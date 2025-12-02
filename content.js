// content script injected into every page. Adds autocomplete suggestions to inputs/textarea/contenteditable.
(function(){
  const SUGGESTION_BOX_ID = '__uautocomplete_box_v1';
  let suggestions = [];
  let currentMatches = []; // Store the currently displayed suggestions
  let activeInput = null;
  let selectedIndex = -1;
  let visible = false;
  let debounceTimer = null;

  // create suggestion box
  function createBox(){
    if (document.getElementById(SUGGESTION_BOX_ID)) return;
    const box = document.createElement('div');
    box.id = SUGGESTION_BOX_ID;
    box.style.position = 'absolute';
    box.style.zIndex = 2147483647;
    box.style.minWidth = '200px';
    box.style.maxWidth = '480px';
    box.style.background = 'white';
    box.style.border = '1px solid rgba(0,0,0,0.15)';
    box.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    box.style.fontFamily = 'Segoe UI, Roboto, Arial, sans-serif';
    box.style.fontSize = '14px';
    box.style.borderRadius = '6px';
    box.style.overflow = 'hidden';
    box.style.display = 'none';
    box.style.padding = '6px 0';
    box.style.maxHeight = '260px';
    box.style.overflowY = 'auto';
    document.body.appendChild(box);

    box.addEventListener('mousedown', (e) => {
      // prevent blur of input on click
      e.preventDefault();
    });
  }

  function loadSuggestions(callback){
    chrome.runtime.sendMessage({ type: 'getSuggestions' }, (resp) => {
      if (chrome.runtime.lastError) {
        console.log('Extension error:', chrome.runtime.lastError);
        // Fallback to default suggestions if extension not loaded
        suggestions = [
          "Thanks! I'll get back to you shortly.",
          "Sounds great — let's do it.",
          "Could you share more details?",
          "Looking forward to it.",
          "On my way.",
          "I'll follow up soon.",
          "Let me check and update you.",
          "Can you confirm the timeline?",
          "Please find attached.",
          "Happy to help!"
        ];
      } else if (resp && resp.suggestions) {
        suggestions = resp.suggestions;
      }
      if (callback) callback();
    });
  }

  function isTextInput(el){
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'INPUT') {
      const t = el.type;
      return ['text','search','email','url','tel','password'].includes(t);
    }
    return tag === 'TEXTAREA';
  }

  function getCaretCoordinates(el){
    // position box near the input's caret if possible. fallback to bounding rect.
    try {
      const rect = el.getBoundingClientRect();
      return { left: rect.left + window.scrollX, top: rect.bottom + window.scrollY };
    } catch(e){ return { left: 0, top: 0 }; }
  }

  function showBox(items, inputEl){
    createBox();
    const box = document.getElementById(SUGGESTION_BOX_ID);
    box.innerHTML = '';
    if (!items || items.length === 0) { hideBox(); return; }
    
    
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'uac-row';
      row.dataset.index = i;
      row.style.padding = '8px 12px';
      row.style.cursor = 'pointer';
      row.style.whiteSpace = 'nowrap';
      row.style.textOverflow = 'ellipsis';
      row.style.overflow = 'hidden';
      row.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
      row.style.transition = 'background-color 0.1s ease';
      row.textContent = it;
      
      row.addEventListener('mouseenter', () => {
        setSelected(i);
      });
      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        insertSuggestion(i, activeInput);
      });
      box.appendChild(row);
    });
    
    // Remove border from last item
    const lastRow = box.lastElementChild;
    if (lastRow) {
      lastRow.style.borderBottom = 'none';
    }
    
    const coords = getCaretCoordinates(inputEl);
    const rect = inputEl.getBoundingClientRect();
    
    // Position the box below the input, but ensure it stays within viewport
    let left = coords.left;
    let top = coords.top;
    
    // Adjust if box would go off-screen
    const boxWidth = Math.min(480, Math.max(200, box.scrollWidth));
    const boxHeight = Math.min(260, items.length * 32 + 12);
    
    if (left + boxWidth > window.innerWidth) {
      left = window.innerWidth - boxWidth - 10;
    }
    if (top + boxHeight > window.innerHeight) {
      top = rect.top + window.scrollY - boxHeight - 5;
    }
    
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    box.style.display = 'block';
    visible = true;
  }

  function hideBox(){
    const box = document.getElementById(SUGGESTION_BOX_ID);
    if (!box) return;
    box.style.display = 'none';
    selectedIndex = -1;
    visible = false;
    currentMatches = []; // Clear current matches
  }

  function setSelected(i){
    const box = document.getElementById(SUGGESTION_BOX_ID);
    if (!box) return;
    const rows = box.querySelectorAll('.uac-row');
    rows.forEach(r => r.style.background = '');
    if (i >= 0 && rows[i]) {
      rows[i].style.background = 'rgba(59, 130, 246, 0.1)';
      rows[i].style.color = 'rgb(59, 130, 246)';
      selectedIndex = i;
    } else selectedIndex = -1;
  }

  function getInputValue(el){
    if (!el) return '';
    if (el.isContentEditable) return el.innerText || el.textContent || '';
    return el.value || '';
  }

  function setInputValue(el, val){
    if (!el) return;
    if (el.isContentEditable) {
      el.focus();
      // replace last token or append depending on design. We'll replace selected part by caret word.
      // Simplest approach: append suggestion.
      el.innerText = val;
    } else {
      el.value = val;
    }
  }

  function insertSuggestion(index, inputEl){
    if (!inputEl) return;
    const s = currentMatches[index];
    if (!s) return;
    

    // Insert suggestion intelligently: replace the current token being typed.
    if (inputEl.isContentEditable) {
      // Replace caret word in contenteditable - simple approach: append suggestion.
      inputEl.focus();
      // find caret and insert plain text
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(s);
        range.insertNode(node);
        // move caret after inserted node
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        inputEl.innerText = s;
      }
    } else {
      const val = inputEl.value;
      const cursorPos = inputEl.selectionStart || val.length;
      
      // Find the start of the current word being typed
      let wordStart = cursorPos;
      while (wordStart > 0 && !/\s/.test(val[wordStart - 1])) {
        wordStart--;
      }
      
      // Replace the current word with the suggestion
      const prefix = val.substring(0, wordStart);
      const suffix = val.substring(cursorPos);
      inputEl.value = prefix + s + suffix;
      
      // place cursor after the inserted suggestion
      const newCursorPos = wordStart + s.length;
      inputEl.selectionStart = inputEl.selectionEnd = newCursorPos;
    }

    hideBox();
  }

  function computeMatches(query){
    if (!query) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    
    // Ensure suggestions array is loaded
    if (!suggestions || suggestions.length === 0) {
      return [];
    }
    
    // match suggestions that contain the query or start with words
    const res = suggestions.filter(s => s.toLowerCase().includes(q));
    
    // Prefer suggestions that start with q
    res.sort((a,b)=>{
      const aStartsWith = a.toLowerCase().indexOf(q) === 0;
      const bStartsWith = b.toLowerCase().indexOf(q) === 0;
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // If both start with query or both don't, sort by length
      return a.length - b.length;
    });
    
    return res.slice(0,8);
  }

  function onInputEvent(e){
    const el = e.target;
    if (!isTextInput(el)) { hideBox(); return; }
    activeInput = el;
    const value = getInputValue(el);
    // get the last token user is typing (after whitespace)
    const token = value.split(/\s+/).pop() || '';
    
    // Only show suggestions if token is at least 2 characters
    if (token.length < 2) { hideBox(); return; }
    
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(()=>{
      const matches = computeMatches(token);
      currentMatches = matches; // Store the current matches
      if (matches.length>0) showBox(matches, el);
      else hideBox();
    }, 120);
  }

  function onKeyDown(e){
    if (!visible) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((selectedIndex+1) % 9);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(selectedIndex <= 0 ? 0 : selectedIndex-1);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (selectedIndex >= 0) {
        e.preventDefault();
        insertSuggestion(selectedIndex, activeInput);
      } else {
        // Always accept the first suggestion when Tab/Enter is pressed
        if (currentMatches.length > 0) {
          e.preventDefault();
          insertSuggestion(0, activeInput);
        }
      }
    } else if (e.key === 'Escape') {
      hideBox();
    }
  }

  function installListeners(){
    document.addEventListener('focusin', (e)=>{
      const el = e.target;
      if (isTextInput(el)) {
        activeInput = el;
        loadSuggestions();
      } else {
        activeInput = null;
        hideBox();
      }
    }, true);

    document.addEventListener('input', (e)=>{
      onInputEvent(e);
    }, true);

    document.addEventListener('keydown', (e)=>{
      onKeyDown(e);
    }, true);

    // click outside -> hide
    document.addEventListener('click', (e)=>{
      const box = document.getElementById(SUGGESTION_BOX_ID);
      if (!box) return;
      if (!box.contains(e.target)) {
        // if clicked inside input, keep it
        if (activeInput && activeInput.contains && activeInput.contains(e.target)) return;
        hideBox();
      }
    }, true);

    // when page changes or scroll, reposition or hide
    window.addEventListener('scroll', ()=>{
      if (visible && activeInput) {
        const box = document.getElementById(SUGGESTION_BOX_ID);
        const coords = getCaretCoordinates(activeInput);
        if (box) {
          box.style.left = coords.left + 'px';
          box.style.top = coords.top + 'px';
        }
      }
    }, true);
  }

  // initialize
  createBox();
  loadSuggestions(installListeners);
})();
