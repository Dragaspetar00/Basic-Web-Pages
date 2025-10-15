// script.js
document.addEventListener('DOMContentLoaded', () => {
  // Elementler
  const titleInput = document.getElementById('titleInput');
  const categorySelect = document.getElementById('categorySelect');
  const tagsInput = document.getElementById('tagsInput');
  const imageUpload = document.getElementById('imageUpload');
  const audioUpload = document.getElementById('audioUpload');
  const contentInput = document.getElementById('contentInput');
  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const noteList = document.getElementById('noteList');
  const searchInput = document.getElementById('searchInput');
  const filterCategory = document.getElementById('filterCategory');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const stats = document.getElementById('stats');
  const mdBold = document.getElementById('mdBold');
  const mdItalic = document.getElementById('mdItalic');
  const mdList = document.getElementById('mdList');
  const mdLink = document.getElementById('mdLink');
  const imgChip = document.getElementById('imgChip');
  const audChip = document.getElementById('audChip');
  const themeToggle = document.getElementById('themeToggle');

  // Data
  let notes = loadNotes();
  let currentImage = null; // base64
  let currentAudio = null; // base64
  let currentTheme = localStorage.getItem('theme') || 'light';
  applyTheme(currentTheme);

  // Eventler
  saveBtn.addEventListener('click', saveNote);
  clearBtn.addEventListener('click', clearForm);
  searchInput.addEventListener('input', renderNotes);
  filterCategory.addEventListener('change', renderNotes);
  exportBtn.addEventListener('click', exportNotes);
  importFile.addEventListener('change', handleImport);
  imageUpload.addEventListener('change', handleImageUpload);
  audioUpload.addEventListener('change', handleAudioUpload);

  mdBold && mdBold.addEventListener('click', () => wrapSelection('**', '**'));
  mdItalic && mdItalic.addEventListener('click', () => wrapSelection('*', '*'));
  mdList && mdList.addEventListener('click', () => insertAtCursor('- '));
  mdLink && mdLink.addEventListener('click', () => wrapSelection('[', '](url)'));

  themeToggle && themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
  });

  // Service Worker (opsiyonel)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg))
        .catch(err => console.log('SW registration failed:', err));
    });
  }

  // Render başlangıç
  renderNotes();

  // --- Fonksiyonlar ---

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeToggle) themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem('notes');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (err) {
      console.error('notes yüklenemedi:', err);
      return [];
    }
  }

  function saveNotesToStorage() {
    try {
      localStorage.setItem('notes', JSON.stringify(notes));
      updateStats();
    } catch (err) {
      console.error('notes kaydedilemedi:', err);
    }
  }

  function saveNote() {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = categorySelect.value;
    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);

    if (!title && !content) {
      alert('Lütfen bir başlık veya içerik girin.');
      return;
    }

    const note = {
      id: Date.now(),
      title,
      content,
      category,
      tags,
      image: currentImage,   // base64 veya null
      audio: currentAudio,   // base64 veya null
      createdAt: new Date().toISOString()
    };

    notes.unshift(note); // yeni en üste
    saveNotesToStorage();
    renderNotes();
    clearForm();
  }

  function clearForm() {
    titleInput.value = '';
    contentInput.value = '';
    tagsInput.value = '';
    categorySelect.value = 'Genel';
    imageUpload.value = '';
    audioUpload.value = '';
    currentImage = null;
    currentAudio = null;
    imgChip.classList.add('hidden');
    audChip.classList.add('hidden');
    titleInput.focus();
  }

  function renderNotes() {
    const q = (searchInput.value || '').toLowerCase();
    const catFilter = filterCategory.value;
    noteList.innerHTML = '';

    const filtered = notes.filter(n => {
      const matchesQ = (n.title + ' ' + n.content + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q);
      const matchesCat = !catFilter || n.category === catFilter;
      return matchesQ && matchesCat;
    });

    if (filtered.length === 0) {
      noteList.innerHTML = '<li class="note"><div class="content">Henüz kayıtlı not yok.</div></li>';
      updateStats();
      return;
    }

    filtered.forEach(n => {
      const li = document.createElement('li');
      li.className = 'note';

      const tagsHtml = (n.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
      const imageHtml = n.image ? `<img src="${n.image}" class="note-img" alt="Resim">` : '';
      const audioHtml = n.audio ? `<audio class="note-audio" controls src="${n.audio}"></audio>` : '';

      li.innerHTML = `
        <div class="note-header">
          <div>
            <div class="note-title">${escapeHtml(n.title || '(Başlıksız)')}</div>
            <div class="meta">
              <span class="note-cat">${escapeHtml(n.category || '')}</span>
              <span>${new Date(n.createdAt).toLocaleString('tr-TR')}</span>
            </div>
          </div>
          <div class="actions">
            <button class="btn" data-id="${n.id}" title="Sil">🗑️</button>
          </div>
        </div>
        <div class="content">${formatContentPreview(n.content)}</div>
        <div class="note-tags">${tagsHtml}</div>
        ${imageHtml}
        ${audioHtml}
      `;

      // sil düğmesi
      const delBtn = li.querySelector('.actions .btn');
      delBtn && delBtn.addEventListener('click', () => {
        if (confirm('Bu notu silmek istediğine emin misin?')) {
          deleteNote(n.id);
        }
      });

      noteList.appendChild(li);
    });

    updateStats();
  }

  function deleteNote(id) {
    notes = notes.filter(n => n.id !== id);
    saveNotesToStorage();
    renderNotes();
  }

  function exportNotes() {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notlar-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('Geçersiz format');
        // basit birleştirme: yeni notları öne ekle
        notes = imported.concat(notes);
        saveNotesToStorage();
        renderNotes();
        alert('Notlar başarıyla içe aktarıldı.');
      } catch (err) {
        alert('İçe aktarma başarısız: Geçersiz JSON.');
        console.error(err);
      } finally {
        importFile.value = '';
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    toBase64(file).then(base => {
      currentImage = base;
      imgChip.classList.remove('hidden');
      alert('Resim yüklendi — kaydet tuşuna basın.');
    }).catch(err => {
      console.error('image read error', err);
      alert('Resim okunamadı.');
    });
  }

  function handleAudioUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    toBase64(file).then(base => {
      currentAudio = base;
      audChip.classList.remove('hidden');
      alert('Ses yüklendi — kaydet tuşuna basın.');
    }).catch(err => {
      console.error('audio read error', err);
      alert('Ses okunamadı.');
    });
  }

  // Markdown benzeri küçük yardımcılar (gösterim için basit)
  function wrapSelection(pre, post) {
    const el = contentInput;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    el.value = text.slice(0, start) + pre + text.slice(start, end) + post + text.slice(end);
    el.focus();
    el.selectionStart = start + pre.length;
    el.selectionEnd = end + pre.length;
  }

  function insertAtCursor(s) {
    const el = contentInput;
    const pos = el.selectionStart || 0;
    el.value = el.value.slice(0, pos) + s + el.value.slice(pos);
    el.focus();
    el.selectionStart = pos + s.length;
    el.selectionEnd = pos + s.length;
  }

  function formatContentPreview(text) {
    if (!text) return '<em style="color:var(--muted)">— boş —</em>';
    // Basit: **kalın**, *italik*, - liste (sadece gösterim)
    let out = escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(^|\n)-\s(.+)/g, '$1<li>$2</li>');
    // listeleri <ul> içine al
    out = out.replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>');
    // newline -> <br> (kalan)
    out = out.replace(/\n/g, '<br>');
    return out;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function updateStats() {
    if (!stats) return;
    stats.textContent = `${notes.length} not`;
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  }
});
