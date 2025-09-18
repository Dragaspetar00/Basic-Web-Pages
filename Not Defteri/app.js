document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');
    const shareBtn = document.getElementById('shareBtn');

    // Görevleri yükle
    loadTasks();

    // Görev ekle
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Görev ekleme fonksiyonu
    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;

        const task = {
            id: Date.now(),
            text: text
        };

        saveTask(task);
        renderTask(task);

        taskInput.value = '';
        taskInput.focus();
    }

    // Görev kaydet (LocalStorage)
    function saveTask(task) {
        let tasks = getTasks();
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Tüm görevleri al
    function getTasks() {
        return JSON.parse(localStorage.getItem('tasks')) || [];
    }

    // Görev sil
    function deleteTask(id) {
        let tasks = getTasks();
        tasks = tasks.filter(task => task.id !== id);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderAllTasks();
    }

    // Tek görevi renderla
    function renderTask(task) {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        li.innerHTML = `
            <span>${task.text}</span>
            <button class="delete-btn">Sil</button>
        `;
        li.querySelector('.delete-btn').addEventListener('click', () => {
            deleteTask(task.id);
        });
        taskList.appendChild(li);
    }

    // Tüm görevleri renderla
    function renderAllTasks() {
        taskList.innerHTML = '';
        const tasks = getTasks();
        tasks.forEach(renderTask);
    }

    // Sayfa yüklendiğinde görevleri göster
    function loadTasks() {
        renderAllTasks();
    }

    // Görevleri paylaş
    shareBtn.addEventListener('click', async () => {
        const tasks = getTasks();
        if (tasks.length === 0) {
            alert('Hiç notun yok!');
            return;
        }

        const text = tasks.map(t => `• ${t.text}`).join('\n');
        const shareData = {
            title: 'Notlarım',
            text: text,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Paylaşım iptal edildi veya desteklenmiyor.');
            }
        } else {
            // Fallback: Kopyala
            navigator.clipboard.writeText(text).then(() => {
                alert('Notlar panoya kopyalandı!');
            });
        }
    });

    // PWA Install Prompt (isteğe bağlı - gelişmiş)
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        // İsteğe bağlı: "Uygulamayı Yükle" butonu ekleyebilirsin.
    });
});

// Service Worker kaydı
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered:', reg))
            .catch(err => console.log('SW registration failed:', err));
    });
}