(function () {
    const SAMPLE_PATTERNS = {
        3: ['3', '51', '423', '441', '531', '612', '7131', '4413', '5511', '50505'],
        4: ['4', '53', '71', '552', '633', '5551', '7531', '7333', '660', '7441'],
        5: ['5', '64', '91', '744', '753', '645', '97531', '66661', '88441'],
        6: ['6', '75', '84', '93', '9555', '9753', '9744', '88842'],
        7: ['7', '86', '95', 'a4', 'b3', '8884', '9667']
    };

    const modal = document.getElementById('samplePatternModal');
    const openBtn = document.getElementById('openSampleModal');
    const closeBtn = document.getElementById('sampleCloseBtn');
    const grid = document.getElementById('samplePatternGrid');
    const tabs = document.querySelectorAll('.sample-tab-btn');
    const input = document.getElementById('siteswapInput');
    const loadBtn = document.getElementById('loadSiteswapBtn');

    if (!modal || !openBtn || !grid || !input || !loadBtn) return;

    function renderPatterns(balls) {
        const patterns = SAMPLE_PATTERNS[balls] || [];
        grid.innerHTML = '';
        patterns.forEach(p => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'sample-pattern-item';
            item.textContent = p;
            item.addEventListener('click', () => {
                input.value = p;
                loadBtn.click();
                closeModal();
            });
            grid.appendChild(item);
        });
    }

    function selectTab(balls) {
        tabs.forEach(t => {
            t.classList.toggle('active', String(t.dataset.balls) === String(balls));
        });
        renderPatterns(balls);
    }

    function openModal() {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => selectTab(tab.dataset.balls));
    });

    selectTab('3');
})();
