class SyncPatternInput {
    static VERSION = "1.0.1";
    constructor(options = {}) {
        // オプションのデフォルト値
        this.options = {
            inputSelector: '#siteswapInput',      // 既存の入力欄のセレクター
            buttonSelector: '#openSyncModal',       // 既存のボタンのセレクター
            modalId: 'syncInputModal',            // モーダルのID
            ...options
        };

        this.modal = null;
        this.syncInputContainer = null;
        this.patternDisplay = null;
        this.inputElement = null;
        this.buttonElement = null;

        this.init();
    }

    init() {
        // 既存の要素を取得
        this.inputElement = document.querySelector(this.options.inputSelector);
        this.buttonElement = document.querySelector(this.options.buttonSelector);

        if (!this.inputElement || !this.buttonElement) {
            //console.error('SyncPatternInput: Required elements not found');
            return;
        }

        // モーダルを作成
        this.createModal();
        
        // イベントリスナーを設定
        this.setupEventListeners();
    }

    // createModalメソッドを修正
    createModal() {
        // モーダルのHTML構造を作成
        const modalHTML = `
            <div id="${this.options.modalId}" class="sync-modal">
                <div class="sync-modal-content">
                    <span class="sync-close">&times;</span>
                    <h3 class="sync-modal-title">シンクロ簡単入力</h3>
                    
                    <div class="sync-pattern-display" id="syncPatternDisplay"></div>

                    <div class="error-display">
                        <output id="erSyncModal" name="erSyncModal"></output>
                    </div>
                    
                    <div class="sync-input-container" id="syncInputContainer">
                        <!-- 動的に生成される入力フィールド -->
                    </div>
                    
                    <div class="sync-short-wrapper">
                        <label for="sync-short" class="sync-short-label">最後に「*」をつけて短縮形とする</label>
                        <input type="checkbox" class="sync-short" id="sync-short">
                    </div>
                    
                    <div class="sync-control-buttons">
                        <button class="sync-control-btn sync-generate-btn" id="syncGenerateBtn">反映</button>
                    </div>
                    
                    <div class="sync-button-descriptions">
                        <h4 class="sync-descriptions-title">ボタンの説明</h4>
                        <div class="sync-descriptions-grid">
                            <div class="sync-description-item">
                                <span class="sync-description-icon">+</span>
                                <span class="sync-description-text">追加 - 新しいビートを追加</span>
                            </div>
                            <div class="sync-description-item">
                                <span class="sync-description-icon">⧉</span>
                                <span class="sync-description-text">複製 - そのビートを複製して追加</span>
                            </div>
                            <div class="sync-description-item">
                                <span class="sync-description-icon">⇅</span>
                                <span class="sync-description-text">入れ替え - ビートの位置を交換</span>
                            </div>
                            <div class="sync-description-item">
                                <span class="sync-description-icon">⇄</span>
                                <span class="sync-description-text">RとL入れ替え - そのビートのRとLの値を交換</span>
                            </div>
                            <div class="sync-description-item">
                                <span class="sync-description-icon">×</span>
                                <span class="sync-description-text">削除 - そのビートを削除</span>
                            </div>
                        </div>
                    </div>
                    
                    <p class="sync-info-text">
                        マルチプレックスの場合は「[8x4]」のように入力欄にxを含めて入力してください。(マルチの場合チェックボックスでのクロス指定はできません)
                    </p>
                </div>
            </div>
        `;

        // モーダルをbodyに追加
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 要素の参照を保存
        this.modal = document.getElementById(this.options.modalId);
        this.syncInputContainer = document.getElementById('syncInputContainer');
        this.patternDisplay = document.getElementById('syncPatternDisplay');
    }

    setupEventListeners() {
        // 既存のボタンにクリックイベントを追加
        this.buttonElement.addEventListener('click', () => this.openModal());

        // モーダル内のイベント
        const closeBtn = this.modal.querySelector('.sync-close');
        const generateBtn = document.getElementById('syncGenerateBtn');
        const syncShortBtn = document.getElementById('sync-short');

        closeBtn.addEventListener('click', () => this.closeModal());
        generateBtn.addEventListener('click', () => this.generatePattern());
        syncShortBtn.addEventListener('change', () => this.updatePattern());

        // モーダル外クリックで閉じる
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Enterキーで反映
        this.syncInputContainer.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.generatePattern();
            }
        });
    }

    // openModalメソッドを修正
    openModal() {
        this.modal.style.display = 'flex';
        if (this.syncInputContainer.children.length === 0) {
            // 初期状態で2ビート追加
            this.addBeat();
            this.addBeat();
        }
        this.updatePattern();
        document.body.classList.add('modal-open');
        
        // 最初のbeatのRにフォーカス
        this.focusFirstEmptyInput();
    }

    // 最初の空の入力欄にフォーカスする
    focusFirstEmptyInput() {
        const firstRightInput = this.syncInputContainer.querySelector('.sync-right-hand');
        if (firstRightInput && firstRightInput.value.trim() === '') {
            firstRightInput.focus();
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    // addBeatメソッドのHTML部分を修正
    addBeat(insertAfterIndex = null) {
        const timestamp = Date.now();
        
        const beatRow = document.createElement('div');
        beatRow.className = 'sync-beat-row';
        beatRow.id = `sync-beat-${timestamp}`;
        beatRow.innerHTML = `
            <div class="sync-hand-inputs">
                <div class="sync-hand-group">
                    <span class="sync-hand-label">R:</span>
                    <input type="text" autocapitalize="off" autocorrect="off" spellcheck="false" class="sync-throw-input sync-right-hand" data-hand="right" data-timestamp="${timestamp}">
                    <div class="sync-checkbox-wrapper">
                        <input type="checkbox" class="sync-cross-checkbox sync-right-cross" id="sync-right-cross-${timestamp}">
                        <span class="sync-multiplex-notice" id="sync-right-notice-${timestamp}">マルチ</span>
                    </div>
                    <label for="sync-right-cross-${timestamp}" class="sync-cross-label">x</label>
                </div>
                
                <div class="sync-hand-group">
                    <span class="sync-hand-label">L:</span>
                    <input type="text" autocapitalize="off" autocorrect="off" spellcheck="false" class="sync-throw-input sync-left-hand" data-hand="left" data-timestamp="${timestamp}">
                    <div class="sync-checkbox-wrapper">
                        <input type="checkbox" class="sync-cross-checkbox sync-left-cross" id="sync-left-cross-${timestamp}">
                        <span class="sync-multiplex-notice" id="sync-left-notice-${timestamp}">マルチ</span>
                    </div>
                    <label for="sync-left-cross-${timestamp}" class="sync-cross-label">x</label>
                </div>
            </div>
            <div class="sync-action-buttons">
                <button class="sync-swap-rl-btn" title="RとLを入れ替え">⇄</button>
                <button class="sync-delete-btn" data-beat-id="sync-beat-${timestamp}">×</button>
            </div>
        `;
        
        // 挿入位置の処理
        if (insertAfterIndex !== null) {
            const allBeats = this.syncInputContainer.querySelectorAll('.sync-beat-row');
            if (insertAfterIndex < allBeats.length) {
                allBeats[insertAfterIndex].after(beatRow);
            } else {
                this.syncInputContainer.appendChild(beatRow);
            }
        } else {
            this.syncInputContainer.appendChild(beatRow);
        }
        
        // イベントリスナーを追加
        this.setupBeatEventListeners(beatRow, timestamp);
        
        // UIを更新
        this.updateAddBetweenButtons();
        this.updatePattern();
    }

    setupBeatEventListeners(beatRow, timestamp) {
        const leftInput = beatRow.querySelector('.sync-left-hand');
        const rightInput = beatRow.querySelector('.sync-right-hand');
        const leftCheckbox = beatRow.querySelector('.sync-left-cross');
        const rightCheckbox = beatRow.querySelector('.sync-right-cross');
        const deleteBtn = beatRow.querySelector('.sync-delete-btn');
        const swapRLBtn = beatRow.querySelector('.sync-swap-rl-btn');

        leftInput.addEventListener('input', (e) => {
            this.checkMultiplexInput(leftInput, timestamp, 'left');
            this.updatePattern();
            this.handleAutoFocus(e.target, 'left');
        });

        rightInput.addEventListener('input', (e) => {
            this.checkMultiplexInput(rightInput, timestamp, 'right');
            this.updatePattern();
            this.handleAutoFocus(e.target, 'right');
        });

        leftCheckbox.addEventListener('change', () => this.updatePattern());
        rightCheckbox.addEventListener('change', () => this.updatePattern());

        deleteBtn.addEventListener('click', () => {
            this.deleteBeat(beatRow.id);
        });

        swapRLBtn.addEventListener('click', () => {
            this.swapRL(beatRow.id);
        });
    }

    isValidForAutoFocus(value){
        //マルチなら移動しない
        if (value.includes('[') || value.includes(']'))return false;
        //マルチ出ない場合
        //記入中なので移動しない
        if (value === '+' || value === '-' || value === '/')return false;
        if(value.length == 2){
            if(["-", "/", "+"].includes(value[0])){
                if(Number.isInteger(SiteswapProcessor.VALID_THROW_CHARS[value[1]])){
                    if(SiteswapProcessor.VALID_THROW_CHARS[value[1]] % 2 === 0){
                        return true;//偶数なので移動する
                    }else{
                        return false;//奇数なので移動しない（正しい形式でない）
                    }
                }else{
                    return false;//数値でないので移動しない（正しい形式でない）
                }
            }else{
                return false;//長さが2なのに接頭辞が存在しないので移動しない（正しい形式でない）
            }
        }else if(value.length == 1){
            if(Number.isInteger(SiteswapProcessor.VALID_THROW_CHARS[value])){
                if(SiteswapProcessor.VALID_THROW_CHARS[value] % 2 === 0){
                    return true;//偶数なので移動する
                }else{
                    return false;//奇数なので移動しない（正しい形式でない）
                }
            }else{
                return false;//数値でないので移動しない（正しい形式でない）
            }
        }else{
            return false;//長さが1または2以外は存在しないので移動しない（正しい形式でない）
        }
    }

    // 自動フォーカス移動の処理
    handleAutoFocus(inputElement, hand) {
        const value = inputElement.value;
        //フォーカスを移動するかどうかを条件分岐
        if (this.isValidForAutoFocus(value)) {
            // requestAnimationFrameを使用してフォーカス移動を次のフレームで実行
            requestAnimationFrame(() => {
                this.moveToNextInput(inputElement, hand);
            });
        }
    }

    // 次の入力欄にフォーカスを移動
    moveToNextInput(currentInput, currentHand) {
        const currentBeatRow = currentInput.closest('.sync-beat-row');
        
        if (currentHand === 'right') {
            // 現在がRの場合、同じbeatのLにフォーカス
            const leftInput = currentBeatRow.querySelector('.sync-left-hand');
            if (leftInput) {
                leftInput.focus();
            }
        } else if (currentHand === 'left') {
            // 現在がLの場合、次のbeatのRにフォーカス
            const nextBeatRow = currentBeatRow.nextElementSibling;
            if (nextBeatRow && nextBeatRow.classList.contains('sync-beat-row')) {
                const nextRightInput = nextBeatRow.querySelector('.sync-right-hand');
                if (nextRightInput) {
                    nextRightInput.focus();
                }
            }
        }
    }

    swapRL(beatId) {
        const beatRow = document.getElementById(beatId);
        if (!beatRow) return;
        
        const leftInput = beatRow.querySelector('.sync-left-hand');
        const rightInput = beatRow.querySelector('.sync-right-hand');
        const leftCheckbox = beatRow.querySelector('.sync-left-cross');
        const rightCheckbox = beatRow.querySelector('.sync-right-cross');
        
        // 値を入れ替え
        const tempValue = leftInput.value;
        leftInput.value = rightInput.value;
        rightInput.value = tempValue;
        
        // チェックボックスの状態を入れ替え
        const tempChecked = leftCheckbox.checked;
        leftCheckbox.checked = rightCheckbox.checked;
        rightCheckbox.checked = tempChecked;
        
        // マルチプレックスチェックを実行
        const timestamp = beatRow.id.split('-')[2];
        this.checkMultiplexInput(leftInput, timestamp, 'left');
        this.checkMultiplexInput(rightInput, timestamp, 'right');
        
        // パターンを更新
        this.updatePattern();
    }

    deleteBeat(beatId) {
        const beatRow = document.getElementById(beatId);
        if (beatRow && this.syncInputContainer.children.length > 1) {
            beatRow.remove();
            this.updateAddBetweenButtons();
            this.updatePattern();
        }
    }

    // updateAddBetweenButtons メソッドを修正
    updateAddBetweenButtons() {
        // 既存のボタンを削除
        const existingButtons = this.syncInputContainer.querySelectorAll('.sync-add-beat-between, .duplicate-btn, .swap-beat-btn');
        existingButtons.forEach(btn => btn.remove());
        
        // 各ビートの後に各種ボタンを配置
        const beatRows = this.syncInputContainer.querySelectorAll('.sync-beat-row');
        beatRows.forEach((row, index) => {
            // 間に追加ボタン
            const addBetweenBtn = document.createElement('button');
            addBetweenBtn.className = 'sync-add-beat-between';
            addBetweenBtn.innerHTML = '+';
            addBetweenBtn.title = '間に追加';
            addBetweenBtn.addEventListener('click', () => {
                this.addBeat(index);
            });
            row.appendChild(addBetweenBtn);
            
            // 複製ボタン
            const duplicateBtn = document.createElement('button');
            duplicateBtn.className = 'duplicate-btn';
            duplicateBtn.innerHTML = '⧉';
            duplicateBtn.title = '複製';
            duplicateBtn.addEventListener('click', () => {
                this.duplicateBeat(row.id);
            });
            row.appendChild(duplicateBtn);
            
            // 入れ替えボタン（最後の要素以外に表示）
            if (index < beatRows.length - 1) {
                const swapBeatBtn = document.createElement('button');
                swapBeatBtn.className = 'swap-beat-btn';
                swapBeatBtn.innerHTML = '⇅';
                swapBeatBtn.title = '次と入れ替え';
                swapBeatBtn.addEventListener('click', () => {
                    this.swapWithNext(row.id);
                });
                row.appendChild(swapBeatBtn);
            }
        });
    }

    // 下に移動（次のbeatと入れ替え）
    swapWithNext(beatId) {
        const beatRow = document.getElementById(beatId);
        const nextBeat = beatRow.nextElementSibling;
        
        // 次の要素の後に現在の要素を移動
        nextBeat.after(beatRow);
        
        // 更新処理
        this.updateAddBetweenButtons();
        this.updatePattern();
    }

    // ビートを複製する関数
    duplicateBeat(beatId) {
        const originalBeat = document.getElementById(beatId);
        if (!originalBeat) return;
        
        // 元のビートの値を取得
        const leftInput = originalBeat.querySelector('.sync-left-hand');
        const rightInput = originalBeat.querySelector('.sync-right-hand');
        const leftCross = originalBeat.querySelector('.sync-left-cross');
        const rightCross = originalBeat.querySelector('.sync-right-cross');
        
        const leftValue = leftInput.value;
        const rightValue = rightInput.value;
        const leftCrossChecked = leftCross.checked;
        const rightCrossChecked = rightCross.checked;
        
        // 現在のインデックスを取得
        const allBeats = Array.from(this.syncInputContainer.querySelectorAll('.sync-beat-row'));
        const currentIndex = allBeats.indexOf(originalBeat);
        
        // 新しいビートを追加
        this.addBeat(currentIndex);
        
        // 新しく追加されたビートを直接取得して値をコピー
        const newBeats = Array.from(this.syncInputContainer.querySelectorAll('.sync-beat-row'));
        const newBeat = newBeats[currentIndex + 1];
        
        const newLeftInput = newBeat.querySelector('.sync-left-hand');
        const newRightInput = newBeat.querySelector('.sync-right-hand');
        const newLeftCross = newBeat.querySelector('.sync-left-cross');
        const newRightCross = newBeat.querySelector('.sync-right-cross');
        
        newLeftInput.value = leftValue;
        newRightInput.value = rightValue;
        newLeftCross.checked = leftCrossChecked;
        newRightCross.checked = rightCrossChecked;
        
        // マルチプレックスチェックを実行
        const timestamp = newBeat.id.split('-')[2];
        this.checkMultiplexInput(newLeftInput, timestamp, 'left');
        this.checkMultiplexInput(newRightInput, timestamp, 'right');
        
        // パターンを更新
        this.updatePattern();
    }

    checkMultiplexInput(input, timestamp, hand) {
        const value = input.value;
        const checkbox = document.getElementById(`sync-${hand}-cross-${timestamp}`);
        const notice = document.getElementById(`sync-${hand}-notice-${timestamp}`);
        const label = this.modal.querySelector(`label[for="sync-${hand}-cross-${timestamp}"]`);
        
        // マルチプレックスかどうかをチェック
        if (value.includes('[') || value.includes(']')) {
            checkbox.disabled = true;
            checkbox.checked = false;
            notice.style.display = 'inline';
            label.classList.add('disabled');
        } else {
            checkbox.disabled = false;
            notice.style.display = 'none';
            label.classList.remove('disabled');
        }
    }

    updatePattern() {
        const beatRows = this.syncInputContainer.querySelectorAll('.sync-beat-row');
        let pattern = '';
        
        beatRows.forEach((row) => {
            const leftInput = row.querySelector('.sync-left-hand');
            const rightInput = row.querySelector('.sync-right-hand');
            const leftCross = row.querySelector('.sync-left-cross');
            const rightCross = row.querySelector('.sync-right-cross');
            
            let leftValue = leftInput.value.trim() || '0';
            let rightValue = rightInput.value.trim() || '0';
            
            // チェックボックスがチェックされていたらxを付ける
            if (leftCross.checked && leftValue !== '0' && !leftValue.includes('x')) {
                leftValue += 'x';
            }
            if (rightCross.checked && rightValue !== '0' && !rightValue.includes('x')) {
                rightValue += 'x';
            }
            
            const leftFormatted = this.formatThrow(leftValue);
            const rightFormatted = this.formatThrow(rightValue);
            
            pattern += `(${rightFormatted},${leftFormatted})`;
        });

        const syncShortBtn = document.getElementById('sync-short');
        if(syncShortBtn.checked){
            pattern += '*';
        }

        // SiteswapProcessorが存在する場合のみバリデーション
        if (typeof SiteswapProcessor !== 'undefined') {
            const processor = new SiteswapProcessor();
            const validateResult = processor.validate(pattern);
            this.updateErMessage(validateResult.message, validateResult.isJugglable);
        }
        
        this.patternDisplay.textContent = pattern || '(0,0)';
    }

    updateErMessage(erMessage, isJugglable) {
        const erSyncModal = document.getElementById("erSyncModal");
        if (erSyncModal) {
            erSyncModal.value = erMessage === null ? "" : erMessage;
        }
    }

    formatThrow(value) {
        // 空または0の場合
        if (!value || value === '0') return '0';

        return value;
    }

    generatePattern() {
        this.updatePattern();
        if (this.patternDisplay.textContent) {
            // メインの入力欄に反映
            this.inputElement.value = this.patternDisplay.textContent;
            // モーダルを閉じる
            this.closeModal();
            
            // animationが存在する場合のみ実行
            if (typeof animation !== 'undefined' && animation.start) {
                animation.start(this.inputElement.value);
            }
        }
    }

    // インスタンスを破棄するメソッド
    destroy() {
        if (this.modal) {
            this.modal.remove();
        }
    }
}

// グローバルスコープに明示的に追加
if (typeof window !== 'undefined') {
    window.SyncPatternInput = SyncPatternInput;
}