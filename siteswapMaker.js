/**
 * SiteswapMaker class
 * サイトスワップの作成（Maker機能）を管理するクラス
 * siteswapProcessor.js と siteswapLab.js に依存します
 */
class SiteswapMaker {
    static VERSION = "1.4.0";

    /**
     * @param {number|string} propCount - ボールの数（数値または文字列）
     * @param {string} startPattern - 初期状態を決定するサイトスワップ（空の場合は基底状態）
     * @param {string} endPattern - 目標（終了時）の状態を決定するサイトスワップ（空の場合は基底状態）
     */
    constructor(propCount, startPattern = "", endPattern = "") {
        this.propCount = null;
        this.startPattern = "";
        this.endPattern = "";

        this.currentThrows = []; // 現在までに追加された投げの配列（数値）
        this.history = []; // 状態遷移の履歴

        this.startState = null; // 初期状態
        this.currentState = null; // 現在の状態（配列）
        this.targetState = null; // 目標とする状態

        this.error = null; // エラーメッセージ

        // 入力のバリデーションと正規化
        if (!this._validateInputs(propCount, startPattern, endPattern)) {
            return;
        }

        // 初期化処理
        this.initialize();
    }

    /**
     * 入力のバリデーションと正規化
     * @private
     * @param {number|string} propCount - ボールの数
     * @param {string} startPattern - 直前のサイトスワップ
     * @param {string} endPattern - 直後のサイトスワップ
     * @returns {boolean} 成功したか
     */
    _validateInputs(propCount, startPattern, endPattern) {
        // 1. propCountのバリデーションと設定（補完に必要なので先に行う）
        if (!this._validateAndSetPropCount(propCount)) {
            return false;
        }

        const groundPattern = SiteswapProcessor.CONVERT[this.propCount] || String(this.propCount);

        // 2. パターンの正規化と補完
        this.startPattern = SiteswapProcessor.normalizePattern(startPattern || "").trim() || groundPattern;
        this.endPattern = SiteswapProcessor.normalizePattern(endPattern || "").trim() || groundPattern;

        // 3. 直前のサイトスワップのバリデーション
        const startValidation = SiteswapMaker.validatePattern(this.startPattern, this.propCount);
        if (!startValidation.isValid || !startValidation.isJugglable) {
            this.error = '直前のサイトスワップが無効です: ' + (startValidation.message || '');
            return false;
        }

        // 4. 直後のサイトスワップのバリデーション
        const endValidation = SiteswapMaker.validatePattern(this.endPattern, this.propCount);
        if (!endValidation.isValid || !endValidation.isJugglable) {
            this.error = '直後のサイトスワップが無効です: ' + (endValidation.message || '');
            return false;
        }

        return true;
    }

    /**
     * propCountのバリデーションと設定
     * @private
     * @param {number|string} propCount - ボールの数
     * @returns {boolean} 成功したか
     */
    _validateAndSetPropCount(propCount) {
        if (propCount === '' || propCount === null || propCount === undefined) {
            this.error = 'ボールの数を入力してください';
            return false;
        }

        // 全角を半角に正規化
        let input = SiteswapProcessor.normalizePattern(String(propCount).trim());

        // アルファベットを数値に変換（サイトスワップ特有のa=10, b=11...）
        input = this._convertAlphabetToNumber(input);

        const balls = parseInt(input);

        if (isNaN(balls) || balls < 0 || balls > 35) {
            this.error = 'ボールの数は0〜35の範囲で入力してください';
            return false;
        }

        this.propCount = balls;
        return true;
    }


    /**
     * アルファベット(a-z, A-Z)を数値(10-35)形式の文字列に変換
     * @private
     * @param {string} input - 入力文字列
     * @returns {string} 変換後の文字列
     */
    _convertAlphabetToNumber(input) {
        let result = '';
        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            const code = char.charCodeAt(0);
            if (code >= 97 && code <= 122) { // a-z
                result += (code - 97 + 10).toString();
            } else if (code >= 65 && code <= 90) { // A-Z
                result += (code - 65 + 10).toString();
            } else {
                result += char;
            }
        }
        return result;
    }


    /**
     * 基底状態を取得
     * @param {number} balls - ボール数
     * @returns {number[]} 基底状態の配列
     */
    static getGroundState(balls) {
        const state = [];
        for (let i = 0; i < balls; i++) {
            state.push(i);
        }
        return state;
    }

    /**
     * パターンの状態を計算
     * @param {string} patternStr - サイトスワップパターン
     * @param {number} balls - ボール数
     * @returns {number[]} 状態配列
     */
    static calculatePatternState(patternStr, balls) {
        if (!patternStr || patternStr.trim() === '') {
            return SiteswapMaker.getGroundState(balls);
        }

        const result = SiteswapLab.analyzePattern(patternStr);
        if (result.isValid && result.isJugglable && result.data) {
            return result.data.state;
        }

        return SiteswapMaker.getGroundState(balls);
    }

    /**
     * 初期状態の設定
     * バリデーションは_validateInputsで完了しているため、ここでは状態の計算のみ行う
     * @returns {boolean} 初期化に成功したか
     */
    initialize() {
        this.error = null;

        // 初期状態と目標状態の計算
        this.startState = SiteswapMaker.calculatePatternState(this.startPattern, this.propCount);
        this.currentState = [...this.startState]; // 現在の状態を初期状態で初期化
        this.targetState = SiteswapMaker.calculatePatternState(this.endPattern, this.propCount);

        return true;
    }

    /**
     * 現在の状態から追加（投げること）が可能な数値のリストを取得する
     * @returns {number[]} 追加可能な数値の配列（0-35）
     */
    getPossibleThrows() {
        // ボールが手元にない（0が状態に含まれていない）場合は、0（空手）のみ可能
        if (!this.currentState.includes(0)) {
            return [0];
        }

        const available = [];
        for (let i = 0; i < 36; i++) {
            if (!this.currentState.includes(i)) {
                available.push(i);
            }
        }
        return available;
    }

    /**
     * 状態を更新（数値を投げた後）
     * @param {number[]} state - 現在の状態
     * @param {number} throwValue - 投げる数値
     * @returns {number[]} 新しい状態
     */
    static updateState(state, throwValue) {
        // 全要素を-1して、負の値を削除
        const newState = state.map(s => s - 1).filter(s => s >= 0);
        // 0以外の投げは着地時刻を追加
        if (throwValue > 0) {
            newState.push(throwValue - 1);
        }
        newState.sort((a, b) => a - b);
        return newState;
    }

    /**
     * 投げを追加する
     * @param {number} throwValue - 追加する数値（0-35）
     * @returns {boolean} 追加に成功したか
     */
    add(throwValue) {
        // 投げられるかチェック
        const available = this.getPossibleThrows();
        if (!available.includes(throwValue)) {
            this.error = 'この値は現在投げることができません';
            return false;
        }

        // 履歴に現在の状態を保存
        this.history.push({
            state: [...this.currentState],
            throws: [...this.currentThrows]
        });

        // パターンに追加
        this.currentThrows.push(throwValue);

        // 状態を更新
        this.currentState = SiteswapMaker.updateState(this.currentState, throwValue);

        this.error = null;
        return true;
    }

    /**
     * 一つ戻る（最後に追加した投げを削除）
     * @returns {boolean} 戻ることができたか
     */
    back() {
        if (this.history.length === 0) {
            this.error = '戻る履歴がありません';
            return false;
        }

        const prev = this.history.pop();
        this.currentState = prev.state;
        this.currentThrows = prev.throws;

        this.error = null;
        return true;
    }

    /**
     * 現在までに追加されたサイトスワップ文字列を取得する
     * @returns {string} 文字列（例: "53"）
     */
    getCurrentPatternString() {
        return this.currentThrows.map(n => SiteswapProcessor.CONVERT[n]).join('');
    }

    /**
     * 目標状態に到達するために必要な「残りの投げ」を取得する
     * @returns {string} 接続に必要なサイトスワップ文字列
     */
    getNeededConnection() {
        // 現在の状態から目標状態への接続を計算
        const result = SiteswapLab.calculateConnectionFromStates(this.currentState, this.targetState, false);
        return result.isValid && result.data ? result.data.connection : "";
    }

    /**
     * 作成を終了し、完成したサイトスワップを取得する
     * @returns {string} 完成したサイトスワップ文字列
     */
    finish() {
        const currentPattern = this.getCurrentPatternString();
        const connection = this.getNeededConnection();
        return currentPattern + connection;
    }

    /**
     * 直後の状態から直前の状態に戻るための接続パターンを計算する
     * （ループを完成させるため）
     * @returns {string} ループ接続に必要なサイトスワップ文字列
     */
    getLoopConnection() {
        // 直後の状態から直前の状態への接続を計算
        const result = SiteswapLab.calculateConnectionFromStates(this.targetState, this.startState, false);
        return result.isValid && result.data ? result.data.connection : "";
    }

    /**
     * 完全なループパターンを生成する
     * 直前ss → オリジナルss → 直後ss → [ループ接続] → 直前ss
     * @returns {Object} {pattern: 完全なパターン, loopConnection: ループ接続パターン}
     */
    finishWithLoop() {
        const currentPattern = this.getCurrentPatternString();
        const connection = this.getNeededConnection();
        const basePattern = currentPattern + connection;

        // 直後の状態から直前の状態に戻るための接続を計算
        const loopConnection = this.getLoopConnection();

        return {
            pattern: basePattern + loopConnection,
            userPattern: currentPattern,
            toEndConnection: connection,
            loopConnection: loopConnection
        };
    }

    /**
     * 戻る履歴があるかどうか
     * @returns {boolean}
     */
    canBack() {
        return this.history.length > 0;
    }

    /**
     * パターンの検証
     * @param {string} pattern - 検証するパターン
     * @param {number} expectedBallCount - 期待されるボール数
     * @returns {Object} {isValid, isJugglable, message, ballCount}
     */
    static validatePattern(pattern, expectedBallCount = null) {
        if (!pattern || pattern.trim() === '') {
            return { isValid: true, isJugglable: true, message: null, ballCount: null };
        }

        const result = SiteswapLab.validatePattern(pattern);
        if (!result.isValid || !result.isJugglable) {
            return {
                isValid: result.isValid,
                isJugglable: result.isJugglable,
                message: result.message,
                ballCount: null
            };
        }

        const analysis = SiteswapLab.analyzePattern(pattern);
        const ballCount = analysis.data ? analysis.data.propCount : null;

        if (expectedBallCount !== null && ballCount !== expectedBallCount) {
            return {
                isValid: true,
                isJugglable: true,
                message: `ボール数(${ballCount})が指定(${expectedBallCount})と異なります`,
                ballCount: ballCount
            };
        }

        return {
            isValid: true,
            isJugglable: true,
            message: null,
            ballCount: ballCount
        };
    }

    /**
     * エラーメッセージや現在のステータスをオブジェクトで取得
     */
    getStatus() {
        return {
            propCount: this.propCount,
            currentPattern: this.getCurrentPatternString(),
            neededConnection: this.getNeededConnection(),
            possibleThrows: this.getPossibleThrows(),
            startState: this.startState,
            currentState: this.currentState,
            targetState: this.targetState,
            canBack: this.canBack(),
            error: this.error
        };
    }
}
