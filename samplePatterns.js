(function () {
    const SAMPLE_PATTERNS = {
        3: ['3', '51', '423', '441', '522', '531', '612', '7131', '7401', '50505', '55500', '75300'],
        4: ['4', '53', '71', '534', '552', '561', '633', '714', '741', '5551', '7333', '7441', '7531', '1234567'],
        5: ['5', '91', '645', '744', '753', '915', '66661', '67561', '88441', '97531', '8448641', '123456789'],
        6: ['6', '75', '756', '774', '855', '945', '963', '9555', 'b97531'],
        7: ['7', '867', '966', 'b6666', 'db97531']
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
