/**
 * SiteswapLab class
 * サイトスワップの解析、変換、接続計算などの高度なロジックを提供するクラス
 * siteswapProcessor.js に依存します
 */
class SiteswapLab {
    static VERSION = "1.5.3";
    static #TIMEOUT = 5000; // 5秒でタイムアウト
    static #RESULT_MAX = 100000; // 最大結果数

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

    /**
     * 全角文字を半角に変換する
     * VALID_THROW_CHARSに対応する全角文字を半角に変換します
     * @param {string} input - 変換する文字列
     * @returns {string} 半角に変換された文字列
     */
    static normalizePattern(input) {
        if (!input || typeof input !== 'string') {
            return input;
        }

        // 全角→半角の変換マッピング
        const fullToHalfMap = {
            // 全角数字→半角数字
            '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
            '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
            // 全角小文字アルファベット→半角小文字
            'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
            'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
            'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
            'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
            'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
            // 全角大文字アルファベット→半角大文字
            'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
            'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
            'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O',
            'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
            'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
            // 全角記号→半角記号
            '－': '-', '／': '/', '＋': '+',
            '（': '(', '，': ',', '）': ')',
            '［': '[', '］': ']', '＊': '*'
        };

        // 文字列を1文字ずつ変換
        return input.split('').map(char => fullToHalfMap[char] || char).join('');
    }

    static validatePattern(pattern) {
        try {
            const processor = new SiteswapProcessor();
            const result = processor.validate(pattern);
            return this.#createResult(result.isValid, result.isJugglable, result.message);
        } catch (error) {
            return this.#createResult(false, false, error.message || "パターンの検証中にエラーが発生しました");
        }
    }

    /**
     * patternDataがマルチプレックスを含むかどうかを判定
     * @param {Array} patternData - パターンデータ配列
     * @returns {boolean} マルチプレックスを含む場合true
     */
    static hasMultiplex(patternData) {
        if (!patternData || !Array.isArray(patternData)) {
            return false;
        }
        return patternData.some(beat => beat.numData && beat.numData.length > 1);
    }

    static analyzePattern(pattern) {
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

            // 状態を計算
            const stateResult = this.#calculateState(processor.patternData);
            const state = stateResult.state;

            // 解析成功時：パターンの詳細情報を追加
            const analysisData = {
                maxHeight: processor.patternData.maxHeight,
                propCount: processor.patternData.propCount,
                period: processor.patternData.data.length,
                isAsync: processor.patternData.isAsync,
                hasMultiplex: this.hasMultiplex(processor.patternData.data),
                patternData: processor.patternData.data,
                state: state
            };

            return this.#createResult(true, true, null, analysisData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "パターンの解析中にエラーが発生しました");
        }
    }

    /**
     * アシンクロパターンをシンクロパターンに変換
     */
    static convertAsyncToSync(asyncPattern, isConnection = false) {
        try {
            const processor = new SiteswapProcessor();
            const validationResult = processor.validate(asyncPattern);

            // isConnectionの場合はisValidのみチェック、それ以外はisJugglableもチェック
            if (!validationResult.isValid || (!isConnection && !validationResult.isJugglable)) {
                return this.#createResult(
                    validationResult.isValid,
                    validationResult.isJugglable,
                    validationResult.message
                );
            }

            if (!processor.patternData.isAsync) {
                return this.#createResult(false, false, "入力パターンは既にシンクロパターンです");
            }

            // processor.patternDataをディープコピー
            const syncPatternData = structuredClone(processor.patternData);

            // 奇数長の場合は2倍にする
            const originalLength = syncPatternData.data.length;
            if (originalLength % 2 !== 0) {
                const duplicated = structuredClone(syncPatternData.data);
                // indexを更新しながら追加
                for (const patternData of duplicated) {
                    for (const numData of patternData.numData) {
                        numData.index += originalLength;
                    }
                }
                syncPatternData.data.push(...duplicated);
            }

            // isAsyncをfalseに変更
            syncPatternData.isAsync = false;

            // dataを変換
            for (let i = 0; i < syncPatternData.data.length; i++) {
                const numDataList = syncPatternData.data[i].numData;

                for (const numData of numDataList) {
                    const num = numData.num;
                    const isRightHand = i % 2 === 0;  // 偶数インデックスが右手

                    if (isRightHand) {
                        // 右手: 奇数なら-1してisCross=true
                        if (num % 2 === 1) {
                            numData.num = num - 1;
                            numData.isCross = true;
                        }
                    } else {
                        // 左手: 奇数なら+1してisCross=true
                        if (num % 2 === 1) {
                            numData.num = num + 1;
                            numData.isCross = true;
                        }
                    }
                }
            }

            // maxHeightを再計算
            this.#recalculateMaxHeight(syncPatternData);

            // 文字列化
            const syncString = this.#patternDataToString(syncPatternData);

            const conversionData = {
                asyncPattern: asyncPattern,
                syncPattern: syncString,
                isRepeatNeeded: originalLength % 2 !== 0,
                patternData: syncPatternData
            };

            return this.#createResult(true, true, null, conversionData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "変換中にエラーが発生しました");
        }
    }

    /**
     * シンクロパターンをアシンクロパターンに変換
     */
    static convertSyncToAsync(syncPattern) {
        try {
            const processor = new SiteswapProcessor();
            const validationResult = processor.validate(syncPattern);

            if (!validationResult.isValid || !validationResult.isJugglable) {
                return this.#createResult(
                    validationResult.isValid,
                    validationResult.isJugglable,
                    validationResult.message
                );
            }

            if (processor.patternData.isAsync) {
                return this.#createResult(false, false, "入力パターンは既にアシンクロパターンです");
            }

            // processor.patternDataをディープコピー
            const asyncPatternData = structuredClone(processor.patternData);

            // isAsyncをtrueに変更
            asyncPatternData.isAsync = true;

            // dataを変換
            for (let i = 0; i < asyncPatternData.data.length; i++) {
                const numDataList = asyncPatternData.data[i].numData;

                for (const numData of numDataList) {
                    if (numData.isCross && i % 2 === 0) {
                        numData.num = numData.num + 1;
                    } else if (numData.isCross && i % 2 === 1) {
                        numData.num = numData.num - 1;
                    }
                    numData.isCross = false;
                }
            }

            // maxHeightを再計算
            this.#recalculateMaxHeight(asyncPatternData);

            // 文字列化
            const asyncString = this.#patternDataToString(asyncPatternData);

            const conversionData = {
                syncPattern: syncPattern,
                asyncPattern: asyncString,
                patternData: asyncPatternData
            };

            return this.#createResult(true, true, null, conversionData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "変換中にエラーが発生しました");
        }
    }

    /**
     * patternDataのmaxHeightを再計算
     * @private
     */
    static #recalculateMaxHeight(patternData) {
        patternData.maxHeight = patternData.data.reduce((max, pattern) => {
            const localMax = Math.max(...pattern.numData.map(nd => nd.num));
            return Math.max(max, localMax);
        }, 0);
    }

    /**
     * patternDataを文字列に変換（アシンクロ/シンクロ両対応）
     * @private
     * @param {Object} patternData - 変換するpatternDataオブジェクト
     * @returns {string} 文字列化されたパターン
     */
    static #patternDataToString(patternData) {
        const CONVERT = SiteswapProcessor.CONVERT;

        if (patternData.isAsync) {
            // アシンクロパターンの文字列化
            let asyncString = "";
            for (const pattern of patternData.data) {
                if (pattern.numData.length === 1) {
                    asyncString += CONVERT[pattern.numData[0].num];
                } else {
                    asyncString += "[" + pattern.numData.map(nd => CONVERT[nd.num]).join("") + "]";
                }
            }
            return asyncString;
        } else {
            // シンクロパターンの文字列化
            let syncString = "";
            for (let i = 0; i < patternData.data.length; i += 2) {
                const right = patternData.data[i];      // 右手(偶数インデックス)
                const left = patternData.data[i + 1];   // 左手(奇数インデックス)

                // 左手の文字列化
                const leftParts = left.numData.map(nd => CONVERT[nd.num] + (nd.isCross ? "x" : ""));
                const leftStr = leftParts.length === 1 ? leftParts[0] : "[" + leftParts.join("") + "]";

                // 右手の文字列化
                const rightParts = right.numData.map(nd => CONVERT[nd.num] + (nd.isCross ? "x" : ""));
                const rightStr = rightParts.length === 1 ? rightParts[0] : "[" + rightParts.join("") + "]";

                syncString += `(${rightStr},${leftStr})`;  // (i, i+1)の順 = (右手,左手)
            }
            return syncString;
        }
    }

    /**
     * 接続パターン計算の前処理（バリデーションと空欄パターンの補完）
     * @private
     * @param {string} pattern1 - 基本パターン
     * @param {string} pattern2 - 目標パターン
     * @returns {Object} {isValid, message, processor1, processor2, validation1, validation2}
     */
    static #preprocessConnectionPatterns(pattern1, pattern2) {
        const CONVERT = SiteswapProcessor.CONVERT;

        // 空欄チェックと補完
        const isEmpty1 = !pattern1 || pattern1.trim() === '';
        const isEmpty2 = !pattern2 || pattern2.trim() === '';

        if (isEmpty1 && isEmpty2) {
            return { isValid: false, message: "両方のパターンが空です" };
        }

        let actualPattern1 = pattern1;
        let actualPattern2 = pattern2;

        // 片方が空欄の場合、基底状態を補完（この場合のみボール数制限あり）
        if (isEmpty1 || isEmpty2) {
            const processor = new SiteswapProcessor();
            const targetPattern = isEmpty1 ? pattern2 : pattern1;
            const validation = processor.validate(targetPattern);

            if (!validation.isValid || !validation.isJugglable) {
                return { isValid: false, message: `パターンが無効です - ${validation.message || '不明なエラー'}` };
            }

            const propCount = processor.patternData.propCount;
            const isAsync = processor.patternData.isAsync;

            // アシンクロの場合（補完時のみ0-35個の制限）
            if (isAsync) {
                if (propCount > 35) {
                    return { isValid: false, message: `基底状態の補完は、アシンクロの場合ボール数35個以下でのみ可能です（現在: ${propCount}個）` };
                }
                const groundState = CONVERT[propCount] || propCount.toString();
                if (isEmpty1) {
                    actualPattern1 = groundState;
                } else {
                    actualPattern2 = groundState;
                }
            }
            // シンクロの場合（補完時のみ1-34個の制限）
            else {
                if (propCount === 0 || propCount > 34) {
                    return { isValid: false, message: `基底状態の補完は、シンクロの場合ボール数1-34個でのみ可能です（現在: ${propCount}個）` };
                }

                let groundState;
                if (propCount % 2 === 0) {
                    // 偶数個の場合
                    const n = CONVERT[propCount] || propCount.toString();
                    groundState = `(${n},${n})`;
                } else {
                    // 奇数個の場合
                    const nPlus1 = CONVERT[propCount + 1] || (propCount + 1).toString();
                    const nMinus1 = CONVERT[propCount - 1] || (propCount - 1).toString();
                    groundState = `(${nPlus1}x,${nMinus1})(${nMinus1},${nPlus1}x)`;
                }

                if (isEmpty1) {
                    actualPattern1 = groundState;
                } else {
                    actualPattern2 = groundState;
                }
            }
        }

        // バリデーション
        const processor1 = new SiteswapProcessor();
        const processor2 = new SiteswapProcessor();

        const validation1 = processor1.validate(actualPattern1);
        const validation2 = processor2.validate(actualPattern2);

        if (!validation1.isValid) {
            return { isValid: false, message: `パターン1が無効です - ${validation1.message || '不明なエラー'}` };
        }

        if (!validation1.isJugglable) {
            return { isValid: false, message: `パターン1は投げられません - ${validation1.message || '不明なエラー'}` };
        }

        if (!validation2.isValid) {
            return { isValid: false, message: `パターン2が無効です - ${validation2.message || '不明なエラー'}` };
        }

        if (!validation2.isJugglable) {
            return { isValid: false, message: `パターン2は投げられません - ${validation2.message || '不明なエラー'}` };
        }

        // 同期タイプチェック（アシンクロとシンクロの混在は不可）
        const isAsync1 = processor1.patternData.isAsync;
        const isAsync2 = processor2.patternData.isAsync;

        if (isAsync1 !== isAsync2) {
            return { isValid: false, message: `アシンクロとシンクロパターンの混在は接続できません` };
        }

        // ボール数チェック
        const balls1 = processor1.patternData.propCount;
        const balls2 = processor2.patternData.propCount;

        if (balls1 !== balls2) {
            return { isValid: false, message: `ボール数が異なります（${balls1}個 vs ${balls2}個）` };
        }

        return {
            isValid: true,
            processor1,
            processor2,
            validation1,
            validation2,
            actualPattern1,
            actualPattern2
        };
    }

    /**
     * 2つのサイトスワップパターン間の接続投げを計算
     * @param {string} pattern1 - 基本パターン（空文字列の場合は基底状態が自動補完される）
     * @param {string} pattern2 - 目標パターン（空文字列の場合は基底状態が自動補完される）
     * @returns {Object} 接続情報を含む結果オブジェクト
     */
    static calculateConnectionPattern(pattern1, pattern2) {
        try {
            // 前処理（バリデーションと空欄補完）
            const preprocessResult = this.#preprocessConnectionPatterns(pattern1, pattern2);

            if (!preprocessResult.isValid) {
                return this.#createResult(false, false, preprocessResult.message);
            }

            const { processor1, processor2, actualPattern1, actualPattern2 } = preprocessResult;

            // 同期タイプとボール数の取得
            const isAsync1 = processor1.patternData.isAsync;
            const balls1 = processor1.patternData.propCount;

            // シンクロパターンの場合、アシンクロに変換して計算
            const isSyncPattern = !isAsync1;
            let workPattern1 = actualPattern1;
            let workPattern2 = actualPattern2;
            let workPatternData1 = processor1.patternData;
            let workPatternData2 = processor2.patternData;

            if (isSyncPattern) {
                // シンクロ→アシンクロ変換
                const asyncResult1 = this.convertSyncToAsync(actualPattern1);
                const asyncResult2 = this.convertSyncToAsync(actualPattern2);

                if (!asyncResult1.isValid || !asyncResult1.isJugglable) {
                    return this.#createResult(false, false, `パターン1のアシンクロ変換に失敗: ${asyncResult1.message}`);
                }

                if (!asyncResult2.isValid || !asyncResult2.isJugglable) {
                    return this.#createResult(false, false, `パターン2のアシンクロ変換に失敗: ${asyncResult2.message}`);
                }

                workPattern1 = asyncResult1.data.asyncPattern;
                workPattern2 = asyncResult2.data.asyncPattern;
                workPatternData1 = asyncResult1.data.patternData;
                workPatternData2 = asyncResult2.data.patternData;
            }

            // 状態計算
            const stateResult1 = this.#calculateState(workPatternData1);
            const stateResult2 = this.#calculateState(workPatternData2);

            // pattern1 → pattern2 の接続投げの計算
            const connection = this.#calculateConnection([...stateResult1.state], [...stateResult2.state], isSyncPattern);

            // pattern2 → pattern1 の接続投げの計算（逆方向）
            const reverseConnection = this.#calculateConnection([...stateResult2.state], [...stateResult1.state], isSyncPattern);

            // 接続サイトスワップを文字列に変換
            const CONVERT = SiteswapProcessor.CONVERT;

            // pattern1 → pattern2 の接続文字列（アシンクロ形式）
            let connectionStr = "";
            for (const item of connection) {
                if (item.length > 1) {
                    connectionStr += "[" + item.map(v => CONVERT[v] || v).join("") + "]";
                } else {
                    connectionStr += CONVERT[item[0]] || item[0];
                }
            }

            // pattern2 → pattern1 の接続文字列（アシンクロ形式）
            let reverseConnectionStr = "";
            for (const item of reverseConnection) {
                if (item.length > 1) {
                    reverseConnectionStr += "[" + item.map(v => CONVERT[v] || v).join("") + "]";
                } else {
                    reverseConnectionStr += CONVERT[item[0]] || item[0];
                }
            }

            // シンクロの場合、patternDataから文字列化
            const displayPattern1 = this.#patternDataToString(processor1.patternData);
            const displayPattern2 = this.#patternDataToString(processor2.patternData);

            // シンクロパターンの場合、接続をシンクロに変換
            let connectionStrDisplay = connectionStr;
            let reverseConnectionStrDisplay = reverseConnectionStr;
            let fullConnection = displayPattern1 + connectionStr + displayPattern2 + reverseConnectionStr;
            let conversionErrors = null;

            if (isSyncPattern) {
                // 接続パターンをシンクロに変換
                const syncConnectionResult = this.convertAsyncToSync(connectionStr, true);
                const syncReverseConnectionResult = this.convertAsyncToSync(reverseConnectionStr, true);

                if (syncConnectionResult.isValid) {
                    connectionStrDisplay = syncConnectionResult.data.syncPattern;
                } else {
                    console.warn('接続投げのシンクロ変換に失敗:', syncConnectionResult.message);
                    if (!conversionErrors) conversionErrors = {};
                    conversionErrors.connection = syncConnectionResult.message;
                }

                if (syncReverseConnectionResult.isValid) {
                    reverseConnectionStrDisplay = syncReverseConnectionResult.data.syncPattern;
                } else {
                    console.warn('逆接続投げのシンクロ変換に失敗:', syncReverseConnectionResult.message);
                    if (!conversionErrors) conversionErrors = {};
                    conversionErrors.reverseConnection = syncReverseConnectionResult.message;
                }

                fullConnection = displayPattern1 + connectionStrDisplay + displayPattern2 + reverseConnectionStrDisplay;
            }

            const connectionData = {
                pattern1: displayPattern1,
                pattern2: displayPattern2,
                isSync: isSyncPattern,
                state1: stateResult1.state,
                state2: stateResult2.state,
                preparedBeats1: stateResult1.preparedBeats,
                preparedBeats2: stateResult2.preparedBeats,
                ballCount: balls1,
                connection: connectionStrDisplay,
                connectionArray: connection,
                reverseConnection: reverseConnectionStrDisplay,
                reverseConnectionArray: reverseConnection,
                fullConnection: fullConnection,
                asyncConnection: isSyncPattern ? connectionStr : null,
                asyncReverseConnection: isSyncPattern ? reverseConnectionStr : null,
                conversionErrors: isSyncPattern ? conversionErrors : null
            };

            return this.#createResult(true, true, null, connectionData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "接続計算中にエラーが発生しました");
        }
    }

    /**
     * 2つのサイトスワップパターン間のすべての接続投げを計算（全探索）
     * @param {string} pattern1 - 基本パターン（空文字列の場合は基底状態が自動補完される）
     * @param {string} pattern2 - 目標パターン（空文字列の場合は基底状態が自動補完される）
     * @param {boolean} useThrows2 - calculateAllThrows2を使用するか（デフォルトtrue、テスト用）
     * @returns {Object} すべての接続情報を含む結果オブジェクト
     */
    static calculateAllConnectionPatterns(pattern1, pattern2, useThrows2 = true) {
        try {
            // 前処理（バリデーションと空欄補完）
            const preprocessResult = this.#preprocessConnectionPatterns(pattern1, pattern2);

            if (!preprocessResult.isValid) {
                return this.#createResult(false, false, preprocessResult.message);
            }

            const { processor1, processor2, actualPattern1, actualPattern2 } = preprocessResult;

            // 同期タイプとボール数の取得
            const isAsync1 = processor1.patternData.isAsync;
            const balls1 = processor1.patternData.propCount;

            // シンクロパターンの場合、アシンクロに変換して計算
            const isSyncPattern = !isAsync1;
            let workPattern1 = actualPattern1;
            let workPattern2 = actualPattern2;
            let workPatternData1 = processor1.patternData;
            let workPatternData2 = processor2.patternData;

            if (isSyncPattern) {
                // シンクロ→アシンクロ変換
                const asyncResult1 = this.convertSyncToAsync(actualPattern1);
                const asyncResult2 = this.convertSyncToAsync(actualPattern2);

                if (!asyncResult1.isValid || !asyncResult1.isJugglable) {
                    return this.#createResult(false, false, `パターン1のアシンクロ変換に失敗: ${asyncResult1.message}`);
                }

                if (!asyncResult2.isValid || !asyncResult2.isJugglable) {
                    return this.#createResult(false, false, `パターン2のアシンクロ変換に失敗: ${asyncResult2.message}`);
                }

                workPattern1 = asyncResult1.data.asyncPattern;
                workPattern2 = asyncResult2.data.asyncPattern;
                workPatternData1 = asyncResult1.data.patternData;
                workPatternData2 = asyncResult2.data.patternData;
            }

            // 状態計算
            const stateResult1 = this.#calculateState(workPatternData1);
            const stateResult2 = this.#calculateState(workPatternData2);

            // pattern1 → pattern2 のすべての接続投げの計算（全探索）
            const startTime = performance.now();
            const allConnectionsResult = this.#calculateAllConnections(
                [...stateResult1.state],
                [...stateResult2.state],
                isSyncPattern,
                startTime,
                this.#TIMEOUT,
                useThrows2  // アルゴリズムを選択
            );

            const allConnections = allConnectionsResult.solutions;
            const calculationError = allConnectionsResult.error;

            // 接続サイトスワップを文字列に変換
            const CONVERT = SiteswapProcessor.CONVERT;

            // 配列を文字列化するヘルパー関数
            const arrayToString = (arr) => {
                let str = "";
                for (const item of arr) {
                    if (item.length > 1) {
                        str += "[" + item.map(v => CONVERT[v] || v).join("") + "]";
                    } else {
                        str += CONVERT[item[0]] || item[0];
                    }
                }
                return str;
            };

            // pattern1 → pattern2 の接続文字列（アシンクロ形式）
            const connectionStrings = allConnections.map(conn => arrayToString(conn));

            // シンクロの場合、patternDataから文字列化
            const displayPattern1 = this.#patternDataToString(processor1.patternData);
            const displayPattern2 = this.#patternDataToString(processor2.patternData);

            // シンクロパターンの場合、接続をシンクロに変換
            let connectionStrDisplay = connectionStrings;
            let conversionErrors = null;

            if (isSyncPattern) {
                // 各接続パターンをシンクロに変換
                connectionStrDisplay = connectionStrings.map(str => {
                    const syncResult = this.convertAsyncToSync(str, true);
                    if (syncResult.isValid) {
                        return syncResult.data.syncPattern;
                    } else {
                        if (!conversionErrors) conversionErrors = {};
                        if (!conversionErrors.connections) conversionErrors.connections = [];
                        conversionErrors.connections.push(syncResult.message);
                        return str;
                    }
                });
            }

            const connectionData = {
                pattern1: displayPattern1,
                pattern2: displayPattern2,
                isSync: isSyncPattern,
                solutionCount: allConnections.length,
                state1: stateResult1.state,
                state2: stateResult2.state,
                preparedBeats1: stateResult1.preparedBeats,
                preparedBeats2: stateResult2.preparedBeats,
                ballCount: balls1,
                connections: connectionStrDisplay,
                connectionArrays: allConnections,
                asyncConnections: isSyncPattern ? connectionStrings : null,
                conversionErrors: isSyncPattern ? conversionErrors : null,
                calculationError: calculationError
            };

            return this.#createResult(true, true, null, connectionData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "接続計算中にエラーが発生しました");
        }
    }

    /**
     * patternDataから状態配列を計算（マルチプレックス対応）
     * @private
     * @returns {Object} {state, preparedBeats} を含むオブジェクト
     */
    static #calculateState(patternData) {
        const maxHeight = patternData.maxHeight;
        const dataArray = patternData.data;
        const period = dataArray.length;

        // preparedBeatsを作成（逆順で繰り返す）
        const preparedBeats = [];
        for (let i = 0; i < maxHeight; i++) {
            const beatIndex = period - 1 - (i % period);
            const beat = dataArray[beatIndex];
            preparedBeats.push(beat.numData.map(numData => numData.num));
        }

        // state計算（マルチプレックス対応）
        const state = [];
        // 各ビートを順番に処理
        for (let beatIndex = 0; beatIndex < preparedBeats.length; beatIndex++) {
            const beat = preparedBeats[beatIndex];

            // 各投げの高さから着地時刻を計算
            for (const throwHeight of beat) {
                const landingTime = throwHeight - (beatIndex + 1);//各タイミングの数値にそのインデックス+1を引く

                // 正の着地時刻のみ追加（負の値は過去の着地なので無視）
                if (landingTime >= 0) {
                    state.push(landingTime);
                }
            }
        }
        state.sort((a, b) => a - b);//必要は無いはずだが念のためソート

        return { state, preparedBeats };
    }

    /**
     * 配列subsetがsupersetの部分集合かチェック（個数を考慮）
     * @private
     */
    static #isSubset(subset, superset) {
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
    * 差分を計算
    * @private
    * @param {Array} fromState - 元の状態配列
    * @param {Array} toState - 目標の状態配列（正の値のみ）
    * @param {Array} minusOneCounts - 各タイミングでの-1の個数の配列
    * @returns {Array} 状態の差分配列（負の値と正の値を含む）
    */
    static #calculateDifference(fromState, toState, minusOneCounts) {
        // 正の部分の差分（toStateからfromPositivesを引く）
        const fromPositives = fromState.filter(v => v >= 0);
        const positivesDiff = [...toState];
        for (const val of fromPositives) {
            const index = positivesDiff.indexOf(val);
            if (index > -1) {
                positivesDiff.splice(index, 1);
            }
        }

        // minusOneCountsから負の値を生成（右から-1,-2,-3,...で0のものを抽出）
        const negativesDiff = [];
        for (let i = minusOneCounts.length - 1; i >= 0; i--) {
            const negativeValue = -(minusOneCounts.length - i);
            if (minusOneCounts[i] === 0) {
                negativesDiff.push(negativeValue);
            }
        }

        // 結合してソート(このソートは必要)
        return [...negativesDiff, ...positivesDiff].sort((a, b) => a - b);
    }

    /**
    * 差分をグループ化（マルチプレックス判定）
    * @private
    * @param {Array} minusOneCounts - 各タイミングでの-1の個数の配列
    * @returns {Array} グループ化されたインデックス配列
    */
    static #groupByMultiplex(minusOneCounts) {
        const groups = [];
        let diffIndex = 0;

        for (const count of minusOneCounts) {
            if (count <= 1) {
                // 0個または1個 → 単独投げ
                groups.push([diffIndex++]);
            } else {
                // 2個以上 → マルチプレックス
                const group = [];
                for (let j = 0; j < count; j++) {
                    group.push(diffIndex++);
                }
                groups.push(group);
            }
        }

        return groups;
    }

    /**
     * グループから接続投げを計算（すべての解を取得）
     * グループ内昇順制約により探索空間を大幅削減（順列→組み合わせ）
     * @private
     * @param {Array} groups - グループ化されたインデックス配列
     * @param {Array} stateDifference - 状態の差分配列
     * @param {boolean} isSync - シンクロパターンかどうか
     * @param {number} startTime - 計算開始時刻（performance.now()）
     * @param {number} timeout - タイムアウト時間（ミリ秒）
     * @returns {Object} {solutions: Array, error: string} すべての有効な接続パターンと エラーメッセージ
     */
    static #calculateAllThrows2(groups, stateDifference, isSync = false, startTime, timeout) {
        const totalBeats = groups.length;
        const allSolutions = [];
        const solutionSet = new Set(); // 重複チェック用
        let errorMessage = "";
        const resultMax = this.#RESULT_MAX;
        console.log(`接続投げ全探索開始: グループ数=${groups.length}, 差分=${stateDifference}`);

        // 各beatIndexで使える候補を事前計算（stateDifferenceと同じ位置に投げ高さを保存、使えない場合はnull）
        const candidatesForBeat = [];
        for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
            const isEvenBeat = beatIndex % 2 === 0;
            const candidates = new Array(stateDifference.length);  // stateDifferenceと同じ長さ

            for (let i = 0; i < stateDifference.length; i++) {
                const throwHeight = stateDifference[i] + (totalBeats - beatIndex);

                // 必須条件1: 負にならない（シンクロ/アシンクロ共通）
                if (throwHeight < 0) {
                    candidates[i] = null;
                    continue;
                }

                // 必須条件2: 偶数beatで1にならない（isSyncがtrueの時のみ）
                if (isSync && isEvenBeat && throwHeight === 1) {
                    candidates[i] = null;
                    continue;
                }

                candidates[i] = throwHeight;
            }

            candidatesForBeat.push(candidates);
        }
        // console.log(JSON.stringify(candidatesForBeat)); // デバッグ用（通常はコメントアウト）

        // グループの境界を事前計算
        const groupBoundaries = [];
        let pos = 0;
        for (const group of groups) {
            groupBoundaries.push({ start: pos, end: pos + group.length - 1 });
            pos += group.length;
        }

        // positionからbeatIndexへのマッピングを事前計算
        const positionToBeatIndex = [];
        for (let position = 0; position < stateDifference.length; position++) {
            let beatIndex = 0;
            for (let i = 0; i < groupBoundaries.length; i++) {
                if (position <= groupBoundaries[i].end) {
                    beatIndex = i;
                    break;
                }
            }
            positionToBeatIndex[position] = beatIndex;
        }

        // 事前確定できる位置を計算し、探索順序を最適化
        const forcedAssignments = new Array(stateDifference.length).fill(-1);
        const searchGroups = []; // { beatIndex, positions, candidateCount }
        const used = new Array(stateDifference.length).fill(false);

        // 後ろから前へ処理（選択肢が少ない方から、かつ事前確定の検出）
        for (let beatIndex = candidatesForBeat.length - 1; beatIndex >= 0; beatIndex--) {
            const groupStart = groupBoundaries[beatIndex].start;
            const groupEnd = groupBoundaries[beatIndex].end;
            const groupSize = groupEnd - groupStart + 1;

            // 利用可能な候補を収集
            const available = [];
            for (let i = 0; i < candidatesForBeat[beatIndex].length; i++) {
                if (candidatesForBeat[beatIndex][i] !== null && !used[i]) {
                    available.push(i);
                }
            }

            if (available.length === groupSize) {
                // 候補数 == グループサイズ → 昇順制約により一意に決定
                for (let j = 0; j < groupSize; j++) {
                    const position = groupStart + j;
                    forcedAssignments[position] = available[j];
                    used[available[j]] = true;
                }
            } else {
                // 探索が必要
                const positions = [];
                for (let position = groupStart; position <= groupEnd; position++) {
                    positions.push(position);
                }
                searchGroups.push({
                    beatIndex,
                    positions,
                    candidateCount: available.length
                });
            }
        }

        // 探索グループを候補数が少ない順にソート
        searchGroups.sort((a, b) => a.candidateCount - b.candidateCount);

        // 最適化された順序でsearchPositionsを構築
        const searchPositions = [];
        for (const group of searchGroups) {
            searchPositions.push(...group.positions);
        }

        console.log(`事前確定: ${stateDifference.length - searchPositions.length}/${stateDifference.length}位置, 探索必要: ${searchPositions.length}位置`);

        // すべて確定済みの場合
        if (searchPositions.length === 0) {
            const result = [];
            let assignmentIdx = 0;
            for (let beatIndex = 0; beatIndex < groups.length; beatIndex++) {
                const group = groups[beatIndex];
                const multi = [];
                for (let i = 0; i < group.length; i++) {
                    const candidateIndex = forcedAssignments[assignmentIdx];
                    const throwHeight = candidatesForBeat[positionToBeatIndex[assignmentIdx]][candidateIndex];
                    multi.push(throwHeight);
                    assignmentIdx++;
                }
                result.push(multi);
            }
            allSolutions.push(result);
            return { solutions: allSolutions, error: "" };
        }

        // バックトラッキングで探索（最適化された順序で）
        const assignment = [...forcedAssignments];

        const backtrack = (searchIdx, minIndexInGroup) => {
            // 結果数上限チェック
            if (allSolutions.length >= resultMax) {
                if (!errorMessage) {
                    errorMessage = `出力数が${resultMax}を超えたため中断されました`;
                }
                return false;
            }

            // タイムアウトチェック
            if (performance.now() - startTime > timeout) {
                if (!errorMessage) {
                    errorMessage = `タイムアウト(${timeout / 1000}秒)により中断されました`;
                }
                return false;
            }

            if (searchIdx === searchPositions.length) {
                // 解を見つけたら記録して探索を続ける
                const result = [];
                let assignmentIdx = 0;
                for (let beatIndex = 0; beatIndex < groups.length; beatIndex++) {
                    const group = groups[beatIndex];
                    const multi = [];
                    for (let i = 0; i < group.length; i++) {
                        const candidateIndex = assignment[assignmentIdx];
                        const throwHeight = candidatesForBeat[positionToBeatIndex[assignmentIdx]][candidateIndex];
                        multi.push(throwHeight);
                        assignmentIdx++;
                    }
                    result.push(multi);
                }

                // 重複チェック：マルチプレックス内をソートしてカスタム文字列化
                let resultKey = "";
                for (let i = 0; i < result.length; i++) {
                    if (i > 0) resultKey += "|";
                    const sorted = result[i].length > 1 ? [...result[i]].sort((a, b) => a - b) : result[i];
                    resultKey += sorted.join(",");
                }
                if (!solutionSet.has(resultKey)) {
                    solutionSet.add(resultKey);
                    allSolutions.push(result);
                }
                return true; // 続けて他の解も探索
            }

            const position = searchPositions[searchIdx];
            const beatIndex = positionToBeatIndex[position];

            // このpositionが属するグループの探索開始位置かチェック
            const isFirstInSearchGroup = (searchIdx === 0) ||
                (positionToBeatIndex[searchPositions[searchIdx - 1]] !== beatIndex);

            // グループの最初の探索位置の場合、minIndexをリセット
            const effectiveMinIndex = isFirstInSearchGroup ? 0 : minIndexInGroup;

            // 事前計算された候補のみを試す（グループ内昇順制約: minIndexInGroup以上のみ）
            const candidates = candidatesForBeat[beatIndex];
            for (let i = effectiveMinIndex; i < candidates.length; i++) {
                if (candidates[i] === null) continue;
                if (used[i]) continue;

                used[i] = true;
                assignment[position] = i; // 候補インデックスを代入

                // 次の位置のminIndexを決定：同じグループ内なら i+1、次のグループなら 0
                const nextMinIndex = (searchIdx + 1 < searchPositions.length &&
                    positionToBeatIndex[searchPositions[searchIdx + 1]] === beatIndex)
                    ? i + 1 : 0;

                const continueSearch = backtrack(searchIdx + 1, nextMinIndex);

                // バックトラック
                used[i] = false;

                // エラーが発生した場合は探索を中断
                if (continueSearch === false) {
                    return false;
                }
            }
            return true;
        };

        // 探索実行（初期minIndex = 0）
        const searchCompleted = backtrack(0, 0);

        // 正常完了した場合はエラーメッセージをクリア
        if (searchCompleted && !errorMessage) {
            errorMessage = "";
        }

        return { solutions: allSolutions, error: errorMessage };
    }

    /**
     * グループから接続投げを計算（すべての解を取得）
     * グループ内昇順制約により探索空間を大幅削減（順列→組み合わせ）
     * @private
     * @param {Array} groups - グループ化されたインデックス配列
     * @param {Array} stateDifference - 状態の差分配列
     * @param {boolean} isSync - シンクロパターンかどうか
     * @param {number} startTime - 計算開始時刻（performance.now()）
     * @param {number} timeout - タイムアウト時間（ミリ秒）
     * @returns {Object} {solutions: Array, error: string} すべての有効な接続パターンと エラーメッセージ
     */
    static #calculateAllThrows(groups, stateDifference, isSync = false, startTime, timeout) {
        const totalBeats = groups.length;
        const allSolutions = [];
        const solutionSet = new Set(); // 重複チェック用
        let errorMessage = "";
        const resultMax = this.#RESULT_MAX;
        console.log(`接続投げ全探索開始: グループ数=${groups}, 差分=${stateDifference}`);

        // 各beatIndexで使える候補を事前計算（stateDifferenceと同じ位置に投げ高さを保存、使えない場合はnull）
        const candidatesForBeat = [];
        for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
            const isEvenBeat = beatIndex % 2 === 0;
            const candidates = new Array(stateDifference.length);  // stateDifferenceと同じ長さ

            for (let i = 0; i < stateDifference.length; i++) {
                const throwHeight = stateDifference[i] + (totalBeats - beatIndex);

                // 必須条件1: 負にならない（シンクロ/アシンクロ共通）
                if (throwHeight < 0) {
                    candidates[i] = null;
                    continue;
                }

                // 必須条件2: 偶数beatで1にならない（isSyncがtrueの時のみ）
                if (isSync && isEvenBeat && throwHeight === 1) {
                    candidates[i] = null;
                    continue;
                }

                candidates[i] = throwHeight;
            }

            candidatesForBeat.push(candidates);
        }
        console.log(JSON.stringify(candidatesForBeat)); // デバッグ用（通常はコメントアウト）

        // グループの境界を事前計算
        const groupBoundaries = [];
        let pos = 0;
        for (const group of groups) {
            groupBoundaries.push({ start: pos, end: pos + group.length - 1 });
            pos += group.length;
        }

        // positionからbeatIndexへのマッピングを事前計算
        const positionToBeatIndex = [];
        for (let position = 0; position < stateDifference.length; position++) {
            let beatIndex = 0;
            for (let i = 0; i < groupBoundaries.length; i++) {
                if (position <= groupBoundaries[i].end) {
                    beatIndex = i;
                    break;
                }
            }
            positionToBeatIndex[position] = beatIndex;
        }

        // バックトラッキングですべての組み合わせを探索（グループ内昇順制約）
        const used = new Array(stateDifference.length).fill(false);
        const assignment = [];

        const backtrack = (position, minIndexInGroup) => {
            // 結果数上限チェック
            if (allSolutions.length >= resultMax) {
                if (!errorMessage) {
                    errorMessage = `出力数が${resultMax}を超えたため中断されました`;
                }
                return false;
            }

            // タイムアウトチェック
            if (performance.now() - startTime > timeout) {
                if (!errorMessage) {
                    errorMessage = `タイムアウト(${timeout / 1000}秒)により中断されました`;
                }
                return false;
            }

            if (position === stateDifference.length) {
                // 解を見つけたら記録して探索を続ける
                const result = [];
                let assignmentIdx = 0;
                for (let beatIndex = 0; beatIndex < groups.length; beatIndex++) {
                    const group = groups[beatIndex];
                    const multi = [];
                    for (let i = 0; i < group.length; i++) {
                        multi.push(assignment[assignmentIdx++]); // 既に投げ高さが入っている
                    }
                    result.push(multi);
                }

                // 重複チェック：マルチプレックス内をソートしてカスタム文字列化
                let resultKey = "";
                for (let i = 0; i < result.length; i++) {
                    if (i > 0) resultKey += "|";
                    const sorted = result[i].length > 1 ? [...result[i]].sort((a, b) => a - b) : result[i];
                    resultKey += sorted.join(",");
                }
                if (!solutionSet.has(resultKey)) {
                    solutionSet.add(resultKey);
                    allSolutions.push(result);
                }
                return true; // 続けて他の解も探索
            }

            // 事前計算されたbeatIndexを取得
            const beatIndex = positionToBeatIndex[position];

            // 事前計算された候補のみを試す（グループ内昇順制約: minIndexInGroup以上のみ）
            const candidates = candidatesForBeat[beatIndex];
            for (let i = minIndexInGroup; i < candidates.length; i++) {
                if (candidates[i] === null) continue;
                if (used[i]) continue;

                used[i] = true;
                assignment[position] = candidates[i]; // 投げ高さを代入

                // 次の位置のminIndexを決定：同じグループ内なら i+1、次のグループなら 0
                const nextMinIndex = (position < groupBoundaries[beatIndex].end) ? i + 1 : 0;

                const continueSearch = backtrack(position + 1, nextMinIndex);

                // バックトラック
                used[i] = false;

                // エラーが発生した場合は探索を中断
                if (continueSearch === false) {
                    return false;
                }
            }
            return true;
        };

        // 探索実行（初期minIndex = 0）
        const searchCompleted = backtrack(0, 0);

        // 正常完了した場合はエラーメッセージをクリア
        if (searchCompleted && !errorMessage) {
            errorMessage = "";
        }

        return { solutions: allSolutions, error: errorMessage };
    }

    /**
     * グループから接続投げを計算（最初の解のみ）
     * @private
     */
    static #calculateThrows(groups, stateDifference, isSync = false) {
        const totalBeats = groups.length;

        if (!isSync) {
            // アシンクロの場合は元のロジック
            const result = [];
            for (let beatIndex = 0; beatIndex < groups.length; beatIndex++) {
                const group = groups[beatIndex];
                const multi = group.map(idx => stateDifference[idx] + (totalBeats - beatIndex));
                result.push(multi);
            }
            return result;
        }

        // シンクロの場合：バックトラッキングで条件を満たす順列を探索

        // 各beatIndexで使える値のインデックスを事前計算（探索空間の削減）
        const candidatesForBeat = [];
        for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
            const isEvenBeat = beatIndex % 2 === 0;
            const forbiddenValue = isEvenBeat ? (1 - (totalBeats - beatIndex)) : null;
            const candidates = [];

            for (let i = 0; i < stateDifference.length; i++) {
                const val = stateDifference[i];
                const throwHeight = val + (totalBeats - beatIndex);

                // 必須条件1: 負にならない（v ≤ totalBeats - beatIndex）
                if (throwHeight < 0) continue;

                // 必須条件2: 偶数beatで1にならない
                if (isEvenBeat && val === forbiddenValue) continue;

                candidates.push(i);
            }

            candidatesForBeat.push(candidates);
        }

        // バックトラッキングで順列を探索
        const used = new Array(stateDifference.length).fill(false);
        const assignment = []; // stateDifferenceのインデックスの順列

        const backtrack = (position) => {
            if (position === stateDifference.length) {
                // 全て割り当て完了
                return true;
            }

            // 現在のpositionが属するbeatIndexを計算
            let currentBeatIndex = 0;
            let positionInBeat = position;
            for (let i = 0; i < groups.length; i++) {
                if (positionInBeat < groups[i].length) {
                    currentBeatIndex = i;
                    break;
                }
                positionInBeat -= groups[i].length;
            }

            // 事前計算された候補のみを試す（探索空間の削減）
            const candidates = candidatesForBeat[currentBeatIndex];
            for (const i of candidates) {
                if (used[i]) continue;

                // 条件を満たすので割り当てて次へ
                used[i] = true;
                assignment[position] = i;

                if (backtrack(position + 1)) {
                    return true;
                }

                // バックトラック
                used[i] = false;
            }

            return false;
        };

        // 探索実行
        if (!backtrack(0)) {
            // 解が見つからない場合はアシンクロと同じ元のロジックにフォールバック
            console.warn('シンクロ接続の最適解が見つかりませんでした。元のロジックを使用します。');
            const result = [];
            for (let beatIndex = 0; beatIndex < groups.length; beatIndex++) {
                const group = groups[beatIndex];
                const multi = group.map(idx => stateDifference[idx] + (totalBeats - beatIndex));
                result.push(multi);
            }
            return result;
        }

        // 見つかった割り当てから結果を構築
        const reordered = assignment.map(idx => stateDifference[idx]);

        const result = [];
        let reorderedIdx = 0;
        for (let beatIndex = 0; beatIndex < groups.length; beatIndex++) {
            const group = groups[beatIndex];
            const multi = [];
            for (let i = 0; i < group.length; i++) {
                multi.push(reordered[reorderedIdx++] + (totalBeats - beatIndex));
            }
            result.push(multi);
        }

        return result;
    }

    /**
     * 2つの状態から接続投げを計算
     * @private
     */
    static #calculateConnection(fromState, toState, isSync = false) {
        let iteration = 0;
        const maxFromState = Math.max(...fromState);
        const minusOneCounts = []; // 各タイミングでの-1の個数を保存

        // 負の値以外が部分集合になるまで繰り返す
        // fromStateの最大値が負になった時点で終了
        // isSyncのときに対応して、fromStateの最大値が負になってからもう一回だけ猶予を与える
        while (maxFromState + 1 - iteration >= 0) {
            // 負の値以外を抽出して部分集合判定
            const fromPositives = fromState.filter(v => v >= 0);

            // isSyncの場合は「部分集合である」かつ「iterationが偶数」の両方を満たす必要がある
            if (this.#isSubset(fromPositives, toState) && (!isSync || iteration % 2 === 0)) {
                break;
            }

            fromState = fromState.map(v => v - 1);// 全要素をデクリメント

            // -1の個数をカウントして配列に保存(着地をシミュレートして、どのタイミングでいくつ着地したかを保存)
            const countMinusOne = fromState.filter(v => v === -1).length;
            minusOneCounts.push(countMinusOne);

            iteration++;
        }

        // 差分を計算
        const stateDifference = this.#calculateDifference(fromState, toState, minusOneCounts);

        // マルチプレックス判定とグループ化
        const groups = this.#groupByMultiplex(minusOneCounts);

        // 接続投げを計算
        const connectionThrows = this.#calculateThrows(groups, stateDifference, isSync);

        return connectionThrows;
    }

    /**
     * 2つの状態からすべての接続投げを計算（全探索）
     * @private
     * @param {Array} fromState - 元の状態配列
     * @param {Array} toState - 目標の状態配列
     * @param {boolean} isSync - シンクロパターンかどうか
     * @param {number} startTime - 計算開始時刻（performance.now()）
     * @param {number} timeout - タイムアウト時間（ミリ秒）
     * @param {boolean} useThrows2 - calculateAllThrows2を使用するか（デフォルトfalse）
     * @returns {Object} {solutions: Array, error: string}
     */
    static #calculateAllConnections(fromState, toState, isSync = false, startTime, timeout, useThrows2 = false) {
        let iteration = 0;
        const maxFromState = Math.max(...fromState);
        const minusOneCounts = []; // 各タイミングでの-1の個数を保存

        // 負の値以外が部分集合になるまで繰り返す
        while (maxFromState + 1 - iteration >= 0) {
            const fromPositives = fromState.filter(v => v >= 0);

            if (this.#isSubset(fromPositives, toState) && (!isSync || iteration % 2 === 0)) {
                break;
            }

            fromState = fromState.map(v => v - 1);
            const countMinusOne = fromState.filter(v => v === -1).length;
            minusOneCounts.push(countMinusOne);
            iteration++;
        }

        // 差分を計算
        const stateDifference = this.#calculateDifference(fromState, toState, minusOneCounts);

        // マルチプレックス判定とグループ化
        const groups = this.#groupByMultiplex(minusOneCounts);

        // すべての接続投げを計算（全探索）- アルゴリズムを選択
        const allConnectionThrows = useThrows2
            ? this.#calculateAllThrows2(groups, stateDifference, isSync, startTime, timeout)
            : this.#calculateAllThrows(groups, stateDifference, isSync, startTime, timeout);

        return allConnectionThrows;
    }

    /**
     * テスト用: #calculateAllThrowsを呼び出す
     * @param {Array} groups - グループ化されたインデックス配列
     * @param {Array} stateDifference - 状態の差分配列
     * @param {boolean} isSync - シンクロパターンかどうか
     * @returns {Object} {solutions: Array, error: string}
     */
    static _testCalculateAllThrows(groups, stateDifference, isSync = false) {
        const startTime = performance.now();
        return this.#calculateAllThrows(groups, stateDifference, isSync, startTime, this.#TIMEOUT);
    }

    /**
     * アシンクロパターンをマルチプレックスパターンに変換（ボール数が2倍になる）
     * @param {string} pattern - 変換するアシンクロパターン
     * @returns {Object} 変換結果を含むオブジェクト
     */
    static convertToMultiplex(pattern) {
        try {
            const processor = new SiteswapProcessor();
            const validationResult = processor.validate(pattern);

            if (!validationResult.isValid || !validationResult.isJugglable) {
                return this.#createResult(
                    validationResult.isValid,
                    validationResult.isJugglable,
                    validationResult.message
                );
            }

            if (!processor.patternData.isAsync) {
                return this.#createResult(false, false, "シンクロパターンはマルチ化できません");
            }

            // マルチプレックスを含むパターンは変換不可
            if (this.hasMultiplex(processor.patternData.data)) {
                return this.#createResult(false, false, "マルチプレックスを含むパターンはマルチ化できません");
            }

            // 最大値チェック（12以下のみ対応）
            if (processor.patternData.maxHeight > 12) {
                return this.#createResult(false, false, "最大値はc(12)以下にしてください");
            }

            const CONVERT = SiteswapProcessor.CONVERT;
            const data = processor.patternData.data;

            // マルチ化変換テーブル
            const MULTI_TABLE = {
                0: { throws: ['?', '[22]', '2'], needsAdjust: true },
                1: { throws: ['[11]', '[22]', '2'], needsAdjust: true },
                2: { throws: ['[22]', '[22]', '[22]'], needsAdjust: false },
                3: { throws: ['[75]', '[22]', '2'], needsAdjust: false },
                4: { throws: ['[a8]', '[22]', '2'], needsAdjust: false },
                5: { throws: ['[db]', '[22]', '2'], needsAdjust: false },
                6: { throws: ['[ge]', '[22]', '2'], needsAdjust: false },
                7: { throws: ['[jh]', '[22]', '2'], needsAdjust: false },
                8: { throws: ['[mk]', '[22]', '2'], needsAdjust: false },
                9: { throws: ['[pn]', '[22]', '2'], needsAdjust: false },
                10: { throws: ['[sq]', '[22]', '2'], needsAdjust: false },
                11: { throws: ['[vt]', '[22]', '2'], needsAdjust: false },
                12: { throws: ['[yw]', '[22]', '2'], needsAdjust: false }
            };

            // 各投げをマルチ化
            const result = [];
            for (const beat of data) {
                const num = beat.numData[0].num;
                const multiData = MULTI_TABLE[num];
                if (multiData) {
                    result.push(...multiData.throws);
                }
            }

            // 0や1による前方要素の調整処理
            for (let i = 0; i < result.length; i++) {
                if (result[i] === '?') {
                    // 0の場合: 2つ前と4つ前を0に
                    const idx2 = (i - 2 + result.length) % result.length;
                    const idx4 = (i - 4 + result.length) % result.length;
                    result[idx2] = '0';
                    result[idx4] = '0';
                    result[i] = '0';
                }
                if (result[i] === '[11]') {
                    // 1の場合: 1つ前を0に
                    const idx1 = (i - 1 + result.length) % result.length;
                    result[idx1] = '0';
                }
            }

            const multiplexPattern = result.join('');

            const conversionData = {
                originalPattern: pattern,
                multiplexPattern: multiplexPattern,
                originalBallCount: processor.patternData.propCount,
                newBallCount: processor.patternData.propCount * 2
            };

            return this.#createResult(true, true, null, conversionData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "マルチ変換中にエラーが発生しました");
        }
    }

    /**
     * アシンクロパターンをボックスパターンに変換（ボール数が1増える）
     * @param {string} pattern - 変換するアシンクロパターン
     * @returns {Object} 変換結果を含むオブジェクト
     */
    static convertToBox(pattern) {
        try {
            const processor = new SiteswapProcessor();
            const validationResult = processor.validate(pattern);

            if (!validationResult.isValid || !validationResult.isJugglable) {
                return this.#createResult(
                    validationResult.isValid,
                    validationResult.isJugglable,
                    validationResult.message
                );
            }

            if (!processor.patternData.isAsync) {
                return this.#createResult(false, false, "シンクロパターンはボックス化できません");
            }

            // マルチプレックスを含むパターンは変換不可
            if (this.hasMultiplex(processor.patternData.data)) {
                return this.#createResult(false, false, "マルチプレックスを含むパターンはボックス化できません");
            }

            // 最大値チェック（17以下のみ対応）
            if (processor.patternData.maxHeight > 17) {
                return this.#createResult(false, false, "最大値はh(17)以下にしてください");
            }

            const CONVERT = SiteswapProcessor.CONVERT;
            const data = processor.patternData.data;

            // 数値を2倍にして、奇数ならxを付ける
            const doubled = data.map(beat => {
                const num = beat.numData[0].num;
                const doubledNum = num * 2;
                const char = CONVERT[doubledNum] || doubledNum.toString();
                return num % 2 === 1 ? char + 'x' : char;
            });

            // 奇数長なら2回繰り返す
            let values = doubled;
            if (values.length % 2 !== 0) {
                values = [...doubled, ...doubled];
            }

            // (右手,2x)(2x,左手)形式に変換
            const boxParts = [];
            for (let i = 0; i < values.length; i += 2) {
                const right = values[i];
                const left = values[i + 1];
                boxParts.push(`(${right},2x)(2x,${left})`);
            }

            const boxPattern = boxParts.join('');

            const conversionData = {
                originalPattern: pattern,
                boxPattern: boxPattern,
                originalBallCount: processor.patternData.propCount,
                newBallCount: processor.patternData.propCount + 1
            };

            return this.#createResult(true, true, null, conversionData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "ボックス変換中にエラーが発生しました");
        }
    }

    /**
     * アシンクロパターンをシャワーパターンに変換（ボール数が1増える）
     * @param {string} pattern - 変換するアシンクロパターン
     * @returns {Object} 変換結果を含むオブジェクト
     */
    static convertToShower(pattern) {
        try {
            const processor = new SiteswapProcessor();
            const validationResult = processor.validate(pattern);

            if (!validationResult.isValid || !validationResult.isJugglable) {
                return this.#createResult(
                    validationResult.isValid,
                    validationResult.isJugglable,
                    validationResult.message
                );
            }

            if (!processor.patternData.isAsync) {
                return this.#createResult(false, false, "シンクロパターンはシャワー化できません");
            }

            // マルチプレックスを含むパターンは変換不可
            if (this.hasMultiplex(processor.patternData.data)) {
                return this.#createResult(false, false, "マルチプレックスを含むパターンはシャワー化できません");
            }

            // 最大値チェック（17以下のみ対応）
            if (processor.patternData.maxHeight > 17) {
                return this.#createResult(false, false, "最大値はh(17)以下にしてください");
            }

            const CONVERT = SiteswapProcessor.CONVERT;
            const data = processor.patternData.data;

            // 数値を2倍にして、すべてxを付ける
            const doubled = data.map(beat => {
                const num = beat.numData[0].num;
                const doubledNum = num * 2;
                const char = CONVERT[doubledNum] || doubledNum.toString();
                return char + 'x';
            });

            // (値x,2x)形式に変換
            const showerParts = doubled.map(val => `(${val},2x)`);
            const showerPattern = showerParts.join('');

            const conversionData = {
                originalPattern: pattern,
                showerPattern: showerPattern,
                originalBallCount: processor.patternData.propCount,
                newBallCount: processor.patternData.propCount + 1
            };

            return this.#createResult(true, true, null, conversionData);
        } catch (error) {
            return this.#createResult(false, false, error.message || "シャワー変換中にエラーが発生しました");
        }
    }
}

// issue
// (4x,0)(4x,0)(4x,6x)(0,6x)(0,6x)と(4x,2)(2,6x)(2,2)の接続について、(0x,2)ではなく、(2x,0)が得られるようにしないといけない
// ↑解決
// [235]とaの全探索接続でundefinedが出る