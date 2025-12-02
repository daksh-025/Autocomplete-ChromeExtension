document.addEventListener('DOMContentLoaded', ()=>{
  const ta = document.getElementById('newSuggestions');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const currentList = document.getElementById('currentList');

  function renderList(arr){
    currentList.innerHTML = '';
    (arr || []).forEach(s => {
      const d = document.createElement('div');
      d.className = 's-item';
      d.textContent = s;
      currentList.appendChild(d);
    });
  }

  chrome.runtime.sendMessage({ type: 'getSuggestions' }, (resp)=>{
    const arr = resp && resp.suggestions ? resp.suggestions : [];
    ta.value = (arr || []).join('\n');
    renderList(arr);
  });

  saveBtn.addEventListener('click', ()=>{
    const lines = ta.value.split('\n').map(x => x.trim()).filter(x=>x.length>0);
    chrome.runtime.sendMessage({ type: 'setSuggestions', suggestions: lines }, (res) => {
      if (res && res.ok) {
        renderList(lines);
        alert('Saved!');
      }
    });
  });

  resetBtn.addEventListener('click', ()=>{
    if (!confirm('Reset to default suggestions?')) return;
    chrome.storage.sync.clear(()=>{
      chrome.runtime.sendMessage({}); // wake background to reinit onInstalled? simple: set defaults manually
      // set defaults again
      const defaults = [
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
      chrome.runtime.sendMessage({ type: 'setSuggestions', suggestions: defaults }, (res)=>{
        if (res && res.ok) {
          ta.value = defaults.join('\n');
          renderList(defaults);
          alert('Reset to defaults.');
        }
      });
    });
  });
});
