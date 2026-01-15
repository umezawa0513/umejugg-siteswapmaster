/**
 * SiteswapMaker class
 * サイトスワップの作成（Maker機能）を管理するクラス
 * siteswapProcessor.js と siteswapLab.js に依存します
 */
class SiteswapMaker {
    /**
     * @param {number} propCount - ボールの数
     * @param {string} startPattern - 初期状態を決定するサイトスワップ（空の場合は基底状態）
     * @param {string} endPattern - 目標（終了時）の状態を決定するサイトスワップ（空の場合は基底状態）
     */
    constructor(propCount, startPattern = "", endPattern = "") {
        this.propCount = propCount;
        this.startPattern = startPattern || propCount.toString();
        this.endPattern = endPattern || propCount.toString();

        this.currentThrows = []; // 現在までに追加された投げの配列
        this.history = []; // 状態遷移の履歴

        this.currentState = null; // 現在の状態（配列またはビットマスク）
        this.targetState = null; // 目標とする状態

        // 初期化処理
        this.initialize();
    }

    /**
     * 初期状態の設定とバリデーション
     */
    initialize() {
        // TODO: startPattern と endPattern から初期状態と目標状態を計算
        // SiteswapLab.analyzePattern 等を利用
    }

    /**
     * 投げを追加する
     * @param {number|string} throwValue - 追加する数値（'a', 'b' 等の文字も許容）
     * @returns {boolean} 追加に成功したか
     */
    add(throwValue) {
        // TODO: 現在の状態から throwValue が投げられるかチェック
        // 可能であれば currentThrows に追加し、currentState を更新
        // 履歴 (history) に現在の状態を保存
    }

    /**
     * 一つ戻る（最後に追加した投げを削除）
     * @returns {boolean} 戻ることができたか
     */
    back() {
        // TODO: history から最後のエントリを取り出し、状態を復元
    }

    /**
     * 現在の状態から追加（投げること）が可能な数値のリストを取得する
     * @returns {number[]} 追加可能な数値の配列
     */
    getPossibleThrows() {
        // TODO: currentState を元に、次に投げられる数値（0-35等）を計算
    }

    /**
     * 現在までに追加されたサイトスワップ文字列を取得する
     * @returns {string} 文字列（例: "53"）
     */
    getCurrentPatternString() {
        // TODO: currentThrows を文字列に変換して返す
    }

    /**
     * 目標状態に到達するために必要な「残りの投げ」を取得する
     * @returns {string} 接続に必要なサイトスワップ文字列
     */
    getNeededConnection() {
        // TODO: SiteswapLab.calculateConnectionPattern 等を使用して、
        // currentState から targetState への最短、あるいは適切な接続を計算
    }

    /**
     * 作成を終了し、完成したサイトスワップを取得する
     * @returns {string} 完成したサイトスワップ文字列
     */
    finish() {
        // TODO: getNeededConnection を呼び出して、現在のパターンと結合して完成させる
    }

    /**
     * エラーメッセージや現在のステータスをオブジェクトで取得
     */
    getStatus() {
        return {
            propCount: this.propCount,
            currentPattern: this.getCurrentPatternString(),
            neededConnection: this.getNeededConnection(),
            possibleThrows: this.getPossibleThrows()
        };
    }
}
