class SiteswapLab{
    static VERSION = "1.0.0";

    /**
     * 結果オブジェクトを生成するヘルパーメソッド（構造を一箇所で管理）
     * @private
     */
    static #createResult(isValid, isJugglable, message, data = null) {
        return {
            isValid,
            isJugglable,
            message,
            data
        };
    }

    static validatePattern(pattern){
        try {
            const processor = new SiteswapProcessor();
            const result = processor.validate(pattern);
            return this.#createResult(result.isValid, result.isJugglable, result.message);
        } catch (error) {
            return this.#createResult(false, false, error.message || "パターンの検証中にエラーが発生しました");
        }
    }

    static analyzePattern(pattern){
        try {
            const processor = new SiteswapProcessor();
            const validationResult = processor.validate(pattern);
            
            // バリデーション失敗時
            if (!validationResult.isValid || !validationResult.isJugglable) {
                return this.#createResult(
                    validationResult.isValid,
                    validationResult.isJugglable,
                    validationResult.message
                );
            }
            
            // 解析成功時：パターンの詳細情報を追加
            const analysisData = {
                ballCount: processor.patternData.maxHeight,
                period: processor.patternData.data.length,
                isAsync: processor.patternData.isAsync,
                patternData: processor.patternData.data
            };
            
            return this.#createResult(true, true, null, analysisData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "パターンの解析中にエラーが発生しました");
        }
    }

    static connectPattern(pattern){
        try {
            const processor = new SiteswapProcessor();
            const validationResult = processor.validate(pattern);
            
            // バリデーション失敗時
            if (!validationResult.isValid || !validationResult.isJugglable) {
                return this.#createResult(
                    validationResult.isValid,
                    validationResult.isJugglable,
                    validationResult.message
                );
            }
            
            // 接続成功時：接続可能なパターン情報を追加
            const connectionData = {
                canConnect: true,
                period: processor.patternData.data.length,
                isAsync: processor.patternData.isAsync
                // 将来的に他のパターンとの接続情報などを追加可能
            };
            
            return this.#createResult(true, true, null, connectionData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "パターンの接続中にエラーが発生しました");
        }
    }
}