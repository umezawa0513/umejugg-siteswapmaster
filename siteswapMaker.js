/**
 * SiteswapMaker class
 * サイトスワップの作成（Maker機能）を管理するクラス
 * siteswapProcessor.js と siteswapLab.js に依存します
 */
class SiteswapMaker {
    static VERSION = "1.2.1";

    /**
     * @param {number|string} propCount - ボールの数（数値または文字列）
     * @param {string} startPattern - 初期状態を決定するサイトスワップ（空の場合は基底状態）
     * @param {string} endPattern - 目標（終了時）の状態を決定するサイトスワップ（空の場合は基底状態）
     */
    constructor(propCount, startPattern = "", endPattern = "") {
        this.propCount = null;
        this.startPattern = startPattern;
        this.endPattern = endPattern;

        this.currentThrows = []; // 現在までに追加された投げの配列（数値）
        this.history = []; // 状態遷移の履歴

        this.currentState = null; // 現在の状態（配列）
        this.targetState = null; // 目標とする状態

        this.error = null; // エラーメッセージ

        // propCountのバリデーションと変換
        if (!this._validateAndSetPropCount(propCount)) {
            return;
        }

        // 初期化処理
        this.initialize();
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

        let input = String(propCount).trim();
        if (input === '') {
            this.error = 'ボールの数を入力してください';
            return false;
        }

        // 全角数字を半角に変換、およびアルファベットを数値に変換
        input = this._convertFullWidthToHalfWidth(input);
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
     * 全角数字を半角に変換
     * @private
     * @param {string} input - 入力文字列
     * @returns {string} 変換後の文字列
     */
    _convertFullWidthToHalfWidth(input) {
        const fullWidthNumbers = '０１２３４５６７８９';
        const halfWidthNumbers = '0123456789';
        let result = input;
        for (let i = 0; i < fullWidthNumbers.length; i++) {
            result = result.split(fullWidthNumbers[i]).join(halfWidthNumbers[i]);
        }
        return result;
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

        try {
            const result = SiteswapLab.analyzePattern(patternStr);
            if (result.isValid && result.isJugglable && result.data) {
                return result.data.state;
            }
        } catch (e) {
            console.error('State calculation error:', e);
        }

        return SiteswapMaker.getGroundState(balls);
    }

    /**
     * 初期状態の設定とバリデーション
     * @returns {boolean} 初期化に成功したか
     */
    initialize() {
        this.error = null;

        // startPatternのバリデーション
        if (this.startPattern && this.startPattern.trim() !== '') {
            const validation = SiteswapMaker.validatePattern(this.startPattern, this.propCount);
            if (!validation.isValid || !validation.isJugglable) {
                this.error = '直前のサイトスワップが無効です: ' + (validation.message || '');
                return false;
            }
            if (validation.message) {
                this.error = '直前のサイトスワップ: ' + validation.message;
                return false;
            }
        }

        // endPatternのバリデーション
        if (this.endPattern && this.endPattern.trim() !== '') {
            const validation = SiteswapMaker.validatePattern(this.endPattern, this.propCount);
            if (!validation.isValid || !validation.isJugglable) {
                this.error = '直後のサイトスワップが無効です: ' + (validation.message || '');
                return false;
            }
            if (validation.message) {
                this.error = '直後のサイトスワップ: ' + validation.message;
                return false;
            }
        }

        // 初期状態の計算
        this.currentState = SiteswapMaker.calculatePatternState(this.startPattern, this.propCount);
        this.targetState = SiteswapMaker.calculatePatternState(this.endPattern, this.propCount);

        return true;
    }

    /**
     * 現在の状態から追加（投げること）が可能な数値のリストを取得する
     * @returns {number[]} 追加可能な数値の配列（0-35）
     */
    getPossibleThrows() {
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
        // 現在のパターンが空でも接続計算できるように
        // SiteswapLabの接続計算を使用
        const currentPatternStr = this.getCurrentPatternString();

        // 現在の状態から目標状態への接続を計算
        const connection = this._calculateCompletionPattern(this.currentState, this.targetState);
        return connection;
    }

    /**
     * 完了時に追加が必要なパターンを計算
     * @private
     * @param {number[]} currentState - 現在の状態
     * @param {number[]} targetState - 目標状態
     * @returns {string} 接続パターン文字列
     */
    _calculateCompletionPattern(currentState, targetState) {
        let fromState = [...currentState];
        const toState = [...targetState];

        const connection = [];
        let iteration = 0;
        const maxFromState = fromState.length > 0 ? Math.max(...fromState) : 0;
        const minusOneCounts = [];

        // 負の値以外が部分集合になるまで繰り返す
        while (maxFromState + 1 - iteration >= 0) {
            const fromPositives = fromState.filter(v => v >= 0);

            // 部分集合チェック
            if (this._isSubset(fromPositives, toState)) {
                break;
            }

            // 全要素をデクリメント
            fromState = fromState.map(v => v - 1);

            // -1の個数をカウント
            const countMinusOne = fromState.filter(v => v === -1).length;
            minusOneCounts.push(countMinusOne);

            iteration++;
        }

        // 差分を計算
        const fromPositives = fromState.filter(v => v >= 0);
        const positivesDiff = [...toState];
        for (const val of fromPositives) {
            const index = positivesDiff.indexOf(val);
            if (index > -1) {
                positivesDiff.splice(index, 1);
            }
        }

        // minusOneCountsから負の値を生成
        const negativesDiff = [];
        for (let i = minusOneCounts.length - 1; i >= 0; i--) {
            const negativeValue = -(minusOneCounts.length - i);
            if (minusOneCounts[i] === 0) {
                negativesDiff.push(negativeValue);
            }
        }

        // 差分をソート
        const stateDifference = [...negativesDiff, ...positivesDiff].sort((a, b) => a - b);

        // グループ化
        const groups = [];
        let diffIndex = 0;
        for (const count of minusOneCounts) {
            if (count <= 1) {
                groups.push([diffIndex++]);
            } else {
                const group = [];
                for (let j = 0; j < count; j++) {
                    group.push(diffIndex++);
                }
                groups.push(group);
            }
        }

        // 接続投げを計算
        const totalBeats = groups.length;
        const result = [];
        for (let beatIndex = 0; beatIndex < groups.length; beatIndex++) {
            const group = groups[beatIndex];
            const multi = group.map(idx => stateDifference[idx] + (totalBeats - beatIndex));
            result.push(multi);
        }

        // 文字列に変換
        let connectionStr = "";
        for (const item of result) {
            if (item.length > 1) {
                connectionStr += "[" + item.map(v => SiteswapProcessor.CONVERT[v]).join("") + "]";
            } else {
                connectionStr += SiteswapProcessor.CONVERT[item[0]];
            }
        }

        return connectionStr;
    }

    /**
     * 配列subsetがsupersetの部分集合かチェック（個数を考慮）
     * @private
     */
    _isSubset(subset, superset) {
        const count = {};

        for (const val of superset) {
            count[val] = (count[val] || 0) + 1;
        }

        for (const val of subset) {
            if (!count[val]) {
                return false;
            }
            count[val]--;
        }

        return true;
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
            currentState: this.currentState,
            targetState: this.targetState,
            canBack: this.canBack(),
            error: this.error
        };
    }
}
