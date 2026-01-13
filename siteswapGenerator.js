class SiteswapGenerator {
    static VERSION = "1.0.0";
    static #TIMEOUT = 5000; // 5秒でタイムアウト
    static #RESULT_MAX = 100000;
    static #CONVERT = (() => {
        const convert = [];
        for (let i = 0; i <= 35; i++) {
            convert[i] = i < 10 ? String(i) : String.fromCharCode(87 + i);
        }
        return convert;
    })();

    /**
     * サイトスワップパターンを生成します
     * @param {number} ballInputNum - ボール数
     * @param {number} periodInputNum - 周期（nullまたは未指定の場合は1〜5周期を生成）
     * @param {number} maxhInputNum - 最大投げ高さ
     * @param {boolean} isSort - 降順ソートするかどうか
     * @param {Array<number>} excNumL - 除外する数字のリスト
     * @param {boolean} isReverseOutput - 結果リストを反転するかどうか（昇順出力）
     * @returns {{results: string[], error: string}} 生成されたパターンとエラーメッセージ
     */
    static create(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, isReverseOutput = false) {
        // 入力検証
        if (isNaN(ballInputNum) || ballInputNum < 0 || ballInputNum > 35) {
            return { results: [], error: 'ボールの数は0〜35の範囲で入力してください' };
        }
        if (periodInputNum !== null && periodInputNum !== undefined && periodInputNum !== '' &&
            (isNaN(periodInputNum) || periodInputNum < 0 || periodInputNum > 10)) {
            return { results: [], error: '周期数は0〜10の範囲で入力してください' };
        }
        if (isNaN(maxhInputNum) || maxhInputNum < 0 || maxhInputNum > 35) {
            return { results: [], error: '最大の高さは0〜35の範囲で入力してください' };
        }
        if (maxhInputNum < ballInputNum) {
            return { results: [], error: '最大の高さはボールの数以上を指定してください' };
        }

        // 周期が指定されていない場合は1〜5周期を生成
        if (periodInputNum === null || periodInputNum === undefined || periodInputNum === '') {
            return this.#createMultiplePeriods(ballInputNum, maxhInputNum, isSort, excNumL, isReverseOutput);
        }

        const result = this.#createSinglePeriod(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, performance.now(), this.#TIMEOUT);

        // 出力順が昇順の場合、結果リストを反転する
        if (isReverseOutput && result.results.length > 0) {
            result.results.reverse();
        }

        return result;
    }

    /**
     * 単一周期のサイトスワップパターンを生成します（内部メソッド）
     */
    static #createSinglePeriod(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, startTime, timeout) {
        const period = periodInputNum;
        const targetSum = ballInputNum * period;
        const maxNum = Math.min(targetSum, maxhInputNum);
        const minNum = ballInputNum;
        const excNumLSet = new Set(excNumL);
        const convert = this.#CONVERT;
        const resultMax = this.#RESULT_MAX;

        const results = [];
        const seenPatterns = new Set();
        let erValue = "";

        function addPattern(pattern) {
            const patternStr = pattern.map(v => convert[v]).join('');

            if (seenPatterns.has(patternStr)) return;

            for (let i = 1; i < period; i++) {
                const rotated = [];
                for (let j = 0; j < period; j++) {
                    rotated.push(pattern[(i + j) % period]);
                }
                if (seenPatterns.has(rotated.map(v => convert[v]).join(''))) return;
            }

            results.push(patternStr);
            seenPatterns.add(patternStr);
            for (let i = 1; i < period; i++) {
                const rotated = [];
                for (let j = 0; j < period; j++) {
                    rotated.push(pattern[(i + j) % period]);
                }
                seenPatterns.add(rotated.map(v => convert[v]).join(''));
            }
        }

        function generate(remaining, numLeft, current, landingTimes) {
            if (results.length >= resultMax) {
                erValue = "出力数が" + resultMax + "を超えたため中断されました";
                return false;
            }
            if (performance.now() - startTime > timeout) {
                erValue = "タイムアウト(" + (timeout / 1000) + "秒)により中断されました";
                return false;
            }

            if (remaining / numLeft > maxNum) return true;

            if (numLeft === 1) {
                if (remaining < 0 || remaining > maxNum || excNumLSet.has(remaining)) {
                    return true;
                }

                const lastLandTime = (remaining + current.length) % period;
                if (landingTimes.has(lastLandTime)) return true;

                addPattern([...current, remaining]);
                return true;
            }

            const isFirst = current.length === 0;

            if (isSort) {
                const start = Math.min(maxNum, remaining);
                const end = isFirst ? minNum : 0;

                for (let i = start; i >= end; i--) {
                    if (excNumLSet.has(i)) continue;

                    const landTime = (i + current.length) % period;
                    if (landingTimes.has(landTime)) continue;

                    current.push(i);
                    const newLanding = new Set(landingTimes);
                    newLanding.add(landTime);

                    if (!generate(remaining - i, numLeft - 1, current, newLanding)) {
                        current.pop();
                        return false;
                    }
                    current.pop();
                }
            } else {
                const start = isFirst ? minNum : 0;
                const end = Math.min(maxNum, remaining);

                for (let i = start; i <= end; i++) {
                    if (excNumLSet.has(i)) continue;

                    const landTime = (i + current.length) % period;
                    if (landingTimes.has(landTime)) continue;

                    current.push(i);
                    const newLanding = new Set(landingTimes);
                    newLanding.add(landTime);

                    if (!generate(remaining - i, numLeft - 1, current, newLanding)) {
                        current.pop();
                        return false;
                    }
                    current.pop();
                }
            }
            return true;
        }

        generate(targetSum, period, [], new Set());

        return { results, error: erValue };
    }

    /**
     * パターンが短い周期の繰り返しかどうかをチェックします（内部メソッド）
     * @param {string} pattern - チェックするパターン文字列
     * @returns {boolean} 繰り返しパターンの場合はtrue
     */
    static #isRepetition(pattern) {
        const len = pattern.length;
        if (len <= 1) return false;

        // lenの約数（len未満）をチェック
        for (let d = 1; d < len; d++) {
            if (len % d === 0) {
                // パターンがd文字の繰り返しかチェック
                const base = pattern.substring(0, d);
                let isRep = true;
                for (let i = d; i < len; i += d) {
                    if (pattern.substring(i, i + d) !== base) {
                        isRep = false;
                        break;
                    }
                }
                if (isRep) return true;
            }
        }
        return false;
    }

    /**
     * 1〜5周期のサイトスワップパターンを生成します（内部メソッド）
     */
    static #createMultiplePeriods(ballInputNum, maxhInputNum, isSort, excNumL, isReverseOutput = false) {
        const startTime = performance.now();
        const timeout = this.#TIMEOUT;
        const allResults = [];
        let erValue = "";

        // 1周期から5周期まで順番に計算
        for (let period = 1; period <= 5; period++) {
            const { results, error } = this.#createSinglePeriod(
                ballInputNum,
                period,
                maxhInputNum,
                isSort,
                excNumL,
                startTime,
                timeout
            );

            // 短い周期の繰り返しパターンを除外
            const filteredResults = results.filter(pattern => !this.#isRepetition(pattern));

            // 出力順が昇順の場合、各周期の結果を反転する（周期の順番は1~5で固定）
            if (isReverseOutput && filteredResults.length > 0) {
                filteredResults.reverse();
            }

            // 結果を追加
            allResults.push(...filteredResults);

            // エラーが発生した場合（タイムアウトまたは結果数上限）
            if (error) {
                erValue = error;
                break;
            }

            // タイムアウトチェック
            if (performance.now() - startTime > timeout) {
                erValue = "タイムアウト(" + (timeout / 1000) + "秒)により中断されました";
                break;
            }
        }

        return { results: allResults, error: erValue };
    }

    /**
     * サイトスワップパターンをランダムに指定数取得します
     * @param {number} ballInputNum - ボール数
     * @param {number} periodInputNum - 周期
     * @param {number} maxhInputNum - 最大投げ高さ
     * @param {boolean} isSort - 降順ソートするかどうか
     * @param {Array<number>} excNumL - 除外する数字のリスト
     * @param {boolean} isReverseOutput - 結果リストを反転するかどうか（昇順出力）
     * @param {number} count - 取得するパターン数
     * @returns {{results: string[], error: string}} ランダムに選ばれたパターンとエラーメッセージ
     */
    static createRandom(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, isReverseOutput = false, count) {
        // ランダム出力数の検証
        if (isNaN(count) || count < 1) {
            return { results: [], error: 'ランダム出力数は1以上を指定してください' };
        }

        // ランダム出力の場合、出力順は無視（シャッフルするため）
        const { results, error } = this.create(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, false);

        // createメソッドでエラーがあった場合はそのまま返す
        if (error && results.length === 0) {
            return { results: [], error };
        }

        if (results.length < count) {
            const warningMsg = `要求数${count}に対して${results.length}個のパターンしか存在しません`;
            // Fisher-Yates シャッフルですべてのパターンをランダム化
            const shuffled = [...results];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            // エラーメッセージ（警告）を含めて返す
            return { results: shuffled, error: error ? error + "\n" + warningMsg : warningMsg };
        }

        // Fisher-Yates シャッフルでランダムにcount個選択
        const shuffled = [...results];
        for (let i = 0; i < count; i++) {
            const j = i + Math.floor(Math.random() * (shuffled.length - i));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return { results: shuffled.slice(0, count), error: error };
    }
}