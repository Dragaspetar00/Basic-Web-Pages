document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const categorySelect = document.getElementById('categorySelect');
    const reminderTime = document.getElementById('reminderTime');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');
    const shareBtn = document.getElementById('shareBtn');
    const searchInput = document.getElementById('searchInput');
    const themeToggle = document.getElementById('themeToggle');
    const imageUpload = document.getElementById('imageUpload');

    let tasks = getTasks();
    let currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    // Tema değiştirme
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(currentTheme);
        localStorage.setItem('theme', currentTheme);
    });

    function applyTheme(theme) {
        document.body.className = theme + '-theme';
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }

    // Görev ekle
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Görev ara
    searchInput.addEventListener('input', renderAllTasks);

    // Resim yükleme
    imageUpload.addEventListener('change', handleImageUpload);

    // Panodan resim yapıştırma
    document.addEventListener('paste', async (e) => {
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                const base64 = await toBase64(file);
                const activeTaskInput = document.activeElement === taskInput;
                if (activeTaskInput && !window.currentImage) {
                    window.currentImage = base64;
                    alert('📋 Resim panoya alındı! Görev eklerken eklenecek.');
                }
            }
        }
    });

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            window.currentImage = e.target.result; // geçici olarak tut
            alert('✅ Resim yüklendi! Şimdi görev ekleyin.');
        };
        reader.readAsDataURL(file);
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;

        const task = {
            id: Date.now(),
            text: text,
            category: categorySelect.value,
            completed: false,
            createdAt: new Date().toLocaleString('tr-TR'),
            remindAt: reminderTime.value ? new Date(reminderTime.value) : null,
            image: window.currentImage || null
        };

        // Hatırlatma ayarla
        if (task.remindAt) {
            scheduleReminder(task);
        }

        tasks.push(task);
        saveTasks();
        renderAllTasks();

        // Temizle
        taskInput.value = '';
        reminderTime.value = '';
        window.currentImage = null;
        taskInput.focus();
    }

    function scheduleReminder(task) {
        const now = new Date();
        const delay = task.remindAt - now;

        if (delay > 0) {
            setTimeout(() => {
                showNotification(task.text, task.category);
            }, delay);
        }
    }

    function showNotification(title, body) {
        if (!("Notification" in window)) {
            console.log("Bu tarayıcı bildirimleri desteklemiyor.");
            return;
        }

        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, {
                    body: `Kategori: ${body}`,
                    icon: 'icons/icon-192.png'
                });
            }
        });
    }

    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderAllTasks();
    }

    function toggleComplete(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderAllTasks();
        }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function getTasks() {
        return JSON.parse(localStorage.getItem('tasks')) || [];
    }

    function renderAllTasks() {
        const searchTerm = searchInput.value.toLowerCase();
        taskList.innerHTML = '';

        const filteredTasks = tasks.filter(task =>
            task.text.toLowerCase().includes(searchTerm) ||
            task.category.toLowerCase().includes(searchTerm)
        );

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = task.completed ? 'completed' : '';

            let imageHtml = '';
            if (task.image) {
                imageHtml = `<img src="${task.image}" class="task-image" alt="Ek resim">`;
            }

            let remindText = '';
            if (task.remindAt) {
                remindText = `<br><small>⏰ Hatırlatma: ${new Date(task.remindAt).toLocaleString('tr-TR')}</small>`;
            }

            li.innerHTML = `
                <div class="task-meta">${task.category} • ${task.createdAt} ${remindText}</div>
                <span class="task-text">${task.text}</span>
                ${imageHtml}
                <div class="task-actions">
                    <span class="toggle-complete" title="Tamamla">${task.completed ? '✔️' : '⬜'}</span>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;

            li.querySelector('.toggle-complete').addEventListener('click', () => {
                toggleComplete(task.id);
            });

            li.querySelector('.delete-btn').addEventListener('click', () => {
                deleteTask(task.id);
            });

            taskList.appendChild(li);
        });
    }

    // Sayfa yüklendiğinde
    renderAllTasks();

    // Paylaş
    shareBtn.addEventListener('click', async () => {
        if (tasks.length === 0) {
            alert('Hiç notun yok!');
            return;
        }

        const text = tasks.map(t => 
            `[${t.category}] ${t.text} ${t.completed ? '(✓)' : ''} - ${t.createdAt}`
        ).join('\n');

        const shareData = {
            title: 'Notlarım',
            text: text,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                fallbackCopy(text);
            }
        } else {
            fallbackCopy(text);
        }
    });

    function fallbackCopy(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('📋 Notlar panoya kopyalandı!');
        }).catch(err => {
            alert('Kopyalama başarısız oldu.');
        });
    }

    // PWA Install Prompt (isteğe bağlı)
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    // Service Worker kaydı
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW registered:', reg))
                .catch(err => console.log('SW registration failed:', err));
        });
    }
});

// Yardımcı: File → Base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}