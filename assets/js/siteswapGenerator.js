class SiteswapGenerator {
    static VERSION = "1.1.1";
    static #TIMEOUT = 5000; // 5秒でタイムアウト
    static #RESULT_MAX = 100000;
    static #CONVERT = (() => {
        const convert = [];
        for (let i = 0; i <= 35; i++) {
            convert[i] = i < 10 ? String(i) : String.fromCharCode(87 + i);
        }
        return convert;
    })();
    // シンクロ表記では奇数値が左手側で+1されるため、投げの最大値は34(y)までに制限する
    static #SYNC_MAX_NUM = 34;

    /**
     * サイトスワップパターンを生成します
     * @param {number} ballInputNum - ボール数
     * @param {number} periodInputNum - 周期（nullまたは未指定の場合は1〜5周期を生成）
     * @param {number} maxhInputNum - 最大投げ高さ
     * @param {boolean} isSort - 降順ソートするかどうか
     * @param {Array<number>} excNumL - 除外する数字のリスト
     * @param {boolean} isReverseOutput - 結果リストを反転するかどうか（昇順出力）
     * @param {Object} options - 追加オプション
     * @param {boolean} options.isSync - シンクロサイトスワップとして生成するかどうか
     * @param {boolean} options.isGroundStateOnly - 基底状態から直接入れるパターンのみ生成するかどうか
     * @returns {{results: string[], error: string}} 生成されたパターンとエラーメッセージ
     */
    static create(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, isReverseOutput = false, options = {}) {
        const isSync = !!(options && options.isSync);
        const isGroundStateOnly = !!(options && options.isGroundStateOnly);

        // 入力検証
        if (isNaN(ballInputNum) || ballInputNum < 0 || ballInputNum > 35) {
            return { results: [], error: 'ボールの数は0〜35の範囲で入力してください' };
        }
        if (isSync && ballInputNum > this.#SYNC_MAX_NUM) {
            return { results: [], error: 'シンクロ生成ではボールの数は0〜34の範囲で入力してください' };
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

        const genOptions = { isSync, isGroundStateOnly };

        // 周期が指定されていない場合は1〜5周期を生成
        if (periodInputNum === null || periodInputNum === undefined || periodInputNum === '') {
            return this.#createMultiplePeriods(ballInputNum, maxhInputNum, isSort, excNumL, isReverseOutput, genOptions);
        }

        const result = this.#createSinglePeriod(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, performance.now(), this.#TIMEOUT, genOptions);

        // 出力順が昇順の場合、結果リストを反転する
        if (isReverseOutput && result.results.length > 0) {
            result.results.reverse();
        }

        return result;
    }

    /**
     * 単一周期のサイトスワップパターンを生成します（内部メソッド）
     * @param {Object} genOptions - 生成オプション {isSync, isGroundStateOnly, excludeRepetition, seenSyncDisplays}
     */
    static #createSinglePeriod(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, startTime, timeout, genOptions = {}) {
        const period = periodInputNum;
        const targetSum = ballInputNum * period;
        const isSync = !!genOptions.isSync;
        const isGroundStateOnly = !!genOptions.isGroundStateOnly;
        const excludeRepetition = !!genOptions.excludeRepetition;
        let maxNum = Math.min(targetSum, maxhInputNum);
        if (isSync) {
            maxNum = Math.min(maxNum, this.#SYNC_MAX_NUM);
        }
        const minNum = ballInputNum;
        const excNumLSet = new Set(excNumL);
        const convert = this.#CONVERT;
        const resultMax = this.#RESULT_MAX;

        const results = [];
        const seenPatterns = new Set();
        const seenSyncDisplays = isSync ? (genOptions.seenSyncDisplays || new Set()) : null;
        let erValue = "";

        // クラス内プライベートメソッドへの参照（内部関数から利用するため）
        const isRepetitionFn = (str) => this.#isRepetition(str);
        const groundRotationsFn = (pattern) => this.#groundRotations(pattern, ballInputNum);
        const syncDisplayFn = (pattern, rotations) => this.#syncDisplayString(pattern, rotations);
        // シンクロ表示用: 全回転を候補にする（先頭は生成された回転）
        const allRotations = [];
        for (let i = 0; i < period; i++) allRotations.push(i);

        function rotationString(pattern, offset) {
            let str = '';
            for (let j = 0; j < period; j++) {
                str += convert[pattern[(offset + j) % period]];
            }
            return str;
        }

        function addPattern(pattern) {
            const patternStr = pattern.map(v => convert[v]).join('');

            if (seenPatterns.has(patternStr)) return;

            const rotationStrs = [];
            for (let i = 1; i < period; i++) {
                const rotated = rotationString(pattern, i);
                if (seenPatterns.has(rotated)) return;
                rotationStrs.push(rotated);
            }

            // 回転もまとめて登録（フィルタで除外しても再判定しないように先に登録する）
            seenPatterns.add(patternStr);
            for (const rotated of rotationStrs) {
                seenPatterns.add(rotated);
            }

            // 短い周期の繰り返しパターンを除外（複数周期生成時のみ）
            if (excludeRepetition && isRepetitionFn(patternStr)) return;

            // 基底状態フィルタ: 基底状態から直接入れる回転が無ければ除外
            let groundRotations = null;
            if (isGroundStateOnly) {
                groundRotations = groundRotationsFn(pattern);
                if (groundRotations.length === 0) return;
            }

            let display;
            if (isSync) {
                // シンクロ表記に変換（基底状態フィルタ時は基底状態になる回転のみ候補にする）
                const syncDisplay = syncDisplayFn(pattern, groundRotations || allRotations);
                if (syncDisplay === null) return;
                if (seenSyncDisplays.has(syncDisplay.key)) return;
                seenSyncDisplays.add(syncDisplay.key);
                display = syncDisplay.display;
            } else if (groundRotations && groundRotations[0] !== 0) {
                // 基底状態になる回転で表示する
                display = rotationString(pattern, groundRotations[0]);
            } else {
                display = patternStr;
            }

            results.push(display);
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
     * 基底状態から直接入れる回転（開始位置）の一覧を返します（内部メソッド）
     * 「基底状態から直接入れる」⟺「パターンの状態(state)が {0,1,...,ボール数-1} と一致」であり、
     * 有効なサイトスワップでは状態の要素数がボール数と一致するため、
     * 「すべての着地時刻がボール数未満」であることを確認すれば十分です。
     * 状態計算は siteswapLab.js の #calculateState と同一アルゴリズムです。
     * シンクロ変換は状態を変えないため、シンクロ生成時もこの判定をそのまま使用できます。
     * @param {Array<number>} pattern - パターンの数値配列
     * @param {number} balls - ボール数
     * @returns {Array<number>} 基底状態になる回転オフセットの配列（昇順）
     */
    static #groundRotations(pattern, balls) {
        const period = pattern.length;
        let maxHeight = 0;
        for (const v of pattern) {
            if (v > maxHeight) maxHeight = v;
        }

        const rotations = [];
        for (let r = 0; r < period; r++) {
            let isGround = true;
            for (let i = 0; i < maxHeight; i++) {
                // 回転rのパターンを逆順に走査して着地時刻を計算
                const num = pattern[(r + period - 1 - (i % period)) % period];
                if (num - (i + 1) >= balls) {
                    isGround = false;
                    break;
                }
            }
            if (isGround) rotations.push(r);
        }
        return rotations;
    }

    /**
     * アシンクロパターンをシンクロ表記の文字列に変換します（内部メソッド）
     * 変換規則は siteswapLab.js の convertAsyncToSync と同一:
     * 右手（偶数インデックス）の奇数値は -1 してクロス、左手（奇数インデックス）の奇数値は +1 してクロス。
     * 奇数周期のパターンは2倍に繰り返してから変換します。
     * 0xを含む回転候補は除外します。
     * 候補の回転の中から短縮表記(*)が可能なものを優先して選び、
     * 無ければ先頭の回転候補を完全表記で出力します。
     * 右手・左手を区別しないため、左右を入れ替えた表記を同一キーとして扱います。
     * @param {Array<number>} pattern - アシンクロパターンの数値配列
     * @param {Array<number>} rotationCandidates - 表示に使用してよい回転オフセットの配列（先頭が優先）
     * @returns {{display: string, key: string}|null} シンクロ表記と重複判定キー。全候補が0xを含む場合はnull
     */
    static #syncDisplayString(pattern, rotationCandidates) {
        const period = pattern.length;
        const convert = this.#CONVERT;

        // 回転オフセットからシンクロの投げ配列（{num, cross}）を構築
        const buildThrows = (offset) => {
            const length = period % 2 === 1 ? period * 2 : period;
            const throws = [];
            for (let i = 0; i < length; i++) {
                const num = pattern[(offset + i) % period];
                if (num % 2 === 1) {
                    // 奇数値: 右手(偶数インデックス)は-1、左手(奇数インデックス)は+1してクロス
                    throws.push({ num: i % 2 === 0 ? num - 1 : num + 1, cross: true });
                } else {
                    throws.push({ num, cross: false });
                }
            }
            return throws;
        };

        const formatThrow = (throwData) => convert[throwData.num] + (throwData.cross ? 'x' : '');

        // 投げ配列の[from, to)区間を(右手,左手)ペアの文字列に変換
        const formatPairs = (throws, from, to, swapHands = false) => {
            let str = '';
            for (let i = from; i < to; i += 2) {
                const right = formatThrow(swapHands ? throws[i + 1] : throws[i]);
                const left = formatThrow(swapHands ? throws[i] : throws[i + 1]);
                str += `(${right},${left})`;
            }
            return str;
        };

        const hasZeroCross = (throws) => throws.some(throwData => throwData.num === 0 && throwData.cross);

        const createDisplayResult = (display, mirrorDisplay) => {
            return {
                display,
                key: mirrorDisplay < display ? mirrorDisplay : display
            };
        };

        // 短縮表記(*)の探索: ペア数kが偶数で、後半のペアが前半のペアの左右入れ替えになっている回転を探す
        const length = period % 2 === 1 ? period * 2 : period;
        const pairCount = length / 2;
        if (pairCount % 2 === 0) {
            for (const offset of rotationCandidates) {
                const throws = buildThrows(offset);
                if (hasZeroCross(throws)) continue;

                let isMirror = true;
                for (let j = 0; j < pairCount / 2 && isMirror; j++) {
                    const right = throws[2 * j];
                    const left = throws[2 * j + 1];
                    const mirroredRight = throws[2 * j + pairCount];
                    const mirroredLeft = throws[2 * j + pairCount + 1];
                    if (mirroredRight.num !== left.num || mirroredRight.cross !== left.cross ||
                        mirroredLeft.num !== right.num || mirroredLeft.cross !== right.cross) {
                        isMirror = false;
                    }
                }
                if (isMirror) {
                    const display = formatPairs(throws, 0, pairCount) + '*';
                    const mirrorDisplay = formatPairs(throws, 0, pairCount, true) + '*';
                    return createDisplayResult(display, mirrorDisplay);
                }
            }
        }

        // 短縮表記できない場合は、0xを含まない最初の回転候補を完全表記で出力
        for (const offset of rotationCandidates) {
            const throws = buildThrows(offset);
            if (hasZeroCross(throws)) continue;

            const display = formatPairs(throws, 0, throws.length);
            const mirrorDisplay = formatPairs(throws, 0, throws.length, true);
            return createDisplayResult(display, mirrorDisplay);
        }

        return null;
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
     * @param {Object} genOptions - 生成オプション {isSync, isGroundStateOnly}
     */
    static #createMultiplePeriods(ballInputNum, maxhInputNum, isSort, excNumL, isReverseOutput = false, genOptions = {}) {
        const startTime = performance.now();
        const timeout = this.#TIMEOUT;
        const allResults = [];
        const seenSyncDisplays = genOptions.isSync ? new Set() : null;
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
                timeout,
                // 短い周期の繰り返しパターンの除外は生成時（アシンクロ文字列段階）に行う
                // （シンクロ変換後の文字列では繰り返し判定ができないため）
                { ...genOptions, excludeRepetition: true, seenSyncDisplays }
            );

            // 出力順が昇順の場合、各周期の結果を反転する（周期の順番は1~5で固定）
            if (isReverseOutput && results.length > 0) {
                results.reverse();
            }

            // 結果を追加
            allResults.push(...results);

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
     * @param {Object} options - 追加オプション（createメソッドと同じ）
     * @returns {{results: string[], error: string}} ランダムに選ばれたパターンとエラーメッセージ
     */
    static createRandom(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, isReverseOutput = false, count, options = {}) {
        // ランダム出力数の検証
        if (isNaN(count) || count < 1) {
            return { results: [], error: 'ランダム出力数は1以上を指定してください' };
        }

        // ランダム出力の場合、出力順は無視（シャッフルするため）
        const { results, error } = this.create(ballInputNum, periodInputNum, maxhInputNum, isSort, excNumL, false, options);

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
