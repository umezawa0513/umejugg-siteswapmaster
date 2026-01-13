// Version information
const PROCESSOR_VERSION = '1.1.1';

class Pattern{
    constructor(){
        this.isAsync = null;
        this.data = [];
        this.maxHeight = 0;
        this.propCount = 0;
    }

    setData(isAsync,data){
        this.isAsync = isAsync;
        this.data = data;
        this.maxHeight = this.getMaxNum();
        this.propCount = this.getPropCount();
    }

    // NumDataオブジェクトを作成
    static createNumData(num, index, isCross = false) {
        return {
            num: num,
            index: index,
            isCross: isCross
        };
    }

    // PatternDataオブジェクトを作成
    static createPatternData(prefix, numDataArray = []) {
        return {
            prefix: prefix,
            numData: numDataArray
        };
    }

    // numの最大値を取得
    getMaxNum() {
        if (this.data.length === 0) return 0;
        
        let maxNum = 0; // 0未満はありえないので0から
        for (const patternData of this.data) {
            for (const numData of patternData.numData) {
                if (numData.num > maxNum) {
                    maxNum = numData.num;
                }
            }
        }
        
        return maxNum;
    }

    /**
     * パターンのプロップ数を計算
     * @returns {number} プロップ数（整数）
     */
    getPropCount() {
        if (this.data.length === 0) return 0;
        
        let totalSum = 0;
        let throwCount = 0;
        
        // 全ての数値を合計し、スロー回数をカウント
        for (const patternData of this.data) {
            for (const numData of patternData.numData) {
                totalSum += numData.num;
            }
            throwCount++;
        }
        
        // プロップ数 = 数値の合計 / パターンの長さ
        const propCount = throwCount > 0 ? totalSum / throwCount : 0;
        
        // 有効なサイトスワップは必ず整数になる
        return Math.round(propCount);
    }
}

class SiteswapProcessor{
    static VALID_THROW_CHARS = {
        "0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"a":10,"b":11,"c":12,"d":13,"e":14,
        "f":15,"g":16,"h":17,"i":18,"j":19,"k":20,"l":21,"m":22,"n":23,"o":24,"p":25,"q":26,"r":27,"s":28,
        "t":29,"u":30,"v":31,"w":32,"x":33,"y":34,"z":35,"A":10,"B":11,"C":12,"D":13,"E":14,"F":15,"G":16,
        "H":17,"I":18,"J":19,"K":20,"L":21,"M":22,"N":23,"O":24,"P":25,"Q":26,"R":27,"S":28,"T":29,"U":30,
        "V":31,"W":32,"X":33,"Y":34,"Z":35,"-":"-","/":"/","+":"+","(":"(",",":",",")":")","[":"[","]":"]","*":"*"
    }
    static CONVERT = {
        0:"0", 1:"1", 2:"2", 3:"3", 4:"4", 5:"5", 6:"6", 7:"7", 8:"8", 9:"9", 10:"a", 11:"b",
        12:"c",13:"d", 14:"e", 15:"f", 16:"g",17:"h", 18:"i", 19:"j", 20:"k", 21:"l", 22:"m",23:"n",
        24:"o", 25:"p", 26:"q", 27:"r", 28:"s", 29:"t", 30:"u", 31:"v", 32:"w", 33:"x", 34:"y", 35:"z"
    };

    constructor() {
        this.isValidated = false;
        this.isJugglable = false;
        this.pattern = null;
        this.patternData = new Pattern();
    }

    _result(isValid,isJugglable,message){
        this.isValidated = isValid;
        this.isJugglable = isJugglable;
        return {
            isValid: isValid,
            isJugglable: isJugglable,
            message: message
        }
    }

    /**
     * サイトスワップパターンの形式を検証する
     * @param {string} pattern - 検証するサイトスワップパターン
     * @returns {Object} 検証結果と説明メッセージ
     */
    validate(pattern) {
        this.pattern = pattern.replace(/\s+/g, '');//空白や改行を除く
        if (!this.pattern) {
            return this._result(false,false,null);
        }

        //シンクロとアシンクロは別々で確認
        if(this.pattern.includes('(')||this.pattern.includes(',')||this.pattern.includes(')')||this.pattern.includes('*')) { 
            return this._validateSyncPattern(this.pattern);
        }else{
            return this._validateAsyncPattern(this.pattern);
        }
    }

    _hasKey(str) {
        return str.split('').every(str => SiteswapProcessor.VALID_THROW_CHARS.hasOwnProperty(str));
    }

    /**
     * 非同期パターンの検証
     * 入力は文字列
     * @private
     */
    _validateAsyncPattern(pattern){
        if(!this._hasKey(pattern))return this._result(false,false,"使用できない文字が含まれています");
        let hasPrefix = false;
        let prefix = null;
        let hasMulti = false;
        let multi = [];
        let patternData = [];
        let checkData = [];
        let index = 0;
        let multiIndexList = [];
        for(const char of pattern){
            if(char==="-"||char==="/"||char==="+"){
                if(hasPrefix)return this._result(false,false,"接頭辞が重複しています");
                if(hasMulti)return this._result(false,false,"接頭辞は[]の外に記入してください");
                hasPrefix = true;
                prefix = char;
            }else if(char==="["){
                if(hasMulti)return this._result(false,false,"'['が重複しています");
                hasMulti = true;
            }else if(char==="]"){
                if(!hasMulti)return this._result(false,false,"'['が見つかりません");
                if(!multi.length)return this._result(false,false,"'[]'の中身が存在しません");
                let numData = [];
                for(let i = 0; i<multi.length;i++){
                    numData.push(Pattern.createNumData(multi[i],multiIndexList[i]));
                }
                patternData.push(Pattern.createPatternData((hasPrefix?prefix:"#"),numData));
                hasPrefix = false;
                prefix = null;
                checkData.push(multi);
                hasMulti = false;
                multi = [];
                multiIndexList = [];
            }else{
                if(hasMulti){
                    multi.push(SiteswapProcessor.VALID_THROW_CHARS[char]);
                    multiIndexList.push(index);
                }else{
                    patternData.push(Pattern.createPatternData((hasPrefix?prefix:"#"),[Pattern.createNumData(SiteswapProcessor.VALID_THROW_CHARS[char],index)]));
                    checkData.push(SiteswapProcessor.VALID_THROW_CHARS[char]);
                    hasPrefix = false;
                    prefix = null;
                }
                index++;
            }
        }
        if(hasMulti)return this._result(false,false,"']'が見つかりません");
        if(hasPrefix)return this._result(false,false,"接頭辞の後に数値が見つかりません");
        if(!patternData.length)return this._result(false,false,null);
        this.patternData.setData(true,patternData);
        //console.log(JSON.stringify(this.patternData.getData()));
        //console.log(JSON.stringify(checkData));
        if(this._isJugglableAsync(checkData)){
            return this._result(true,true,null);
        }else{
            return this._result(true,false,"この数列は投げられません");
        }
    }

    /**
     * 非同期パターンのjugglable判定
     * 入力は接頭辞を除いた数値配列
     * @private
     */
    _isJugglableAsync(pattern){
        const arr1 = [];
        const arr2 = [];
        // 着地時点を計算
        for (let i = 0; i < pattern.length; i++) {
            if (Array.isArray(pattern[i])) {
                // マルチプレックスの場合、各数字に対して計算
                for (const _height of pattern[i]) {
                    arr1.push((_height + i + 1) % pattern.length);
                    arr2.push(i + 1);
                }
            } else {
                arr1.push((pattern[i] + i + 1) % pattern.length);
                arr2.push(i + 1);
            }
        }
        const modulo = pattern.length;
       // 各配列の要素をmoduloで割った余りの配列を作成
        const modArr1 = arr1.map(num => ((num % modulo) + modulo) % modulo);
        const modArr2 = arr2.map(num => ((num % modulo) + modulo) % modulo);

        // 配列を昇順にソート
        const sortedModArr1 = modArr1.sort((a, b) => a - b);
        const sortedModArr2 = modArr2.sort((a, b) => a - b);

        // 各要素を比較
        return sortedModArr1.every((val, idx) => val === sortedModArr2[idx]);
    }

    /**
     * シンクロパターンの検証
     * @private
     */
    _validateSyncPattern(pattern){
        if(!this._hasKey(pattern))return this._result(false,false,"使用できない文字が含まれています");
        let patternDataData = [];
        let resultObj = null;
        let isRepeat = pattern.endsWith('*') ? true : false;
        let isError = false;
        pattern = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
        //console.log(pattern);
        const syncTest = /^\([^,()]+,[^,()]+\)(?:\([^,()]+,[^,()]+\))*$/;
        if(!syncTest.test(pattern))return this._result(false,false,"シンクロの形式が正しくありません");
        if(isRepeat){
            // 各括弧のペアを抽出して処理
            const pairs = pattern.split(/\)\(/).map(p => 
                p.replace(/^\(|\)$/g, '').split(',')
            );

            // オリジナルの並びと、要素を入れ替えた並びを作成
            const swappedPairs = pairs.map(([a, b]) => [b, a]);

            // 結果を組み立て
            pattern = pairs.concat(swappedPairs)
                .map(([a, b]) => `(${a},${b})`)
                .join('');
        }
        [patternDataData,isError,resultObj] = this._validateSyncSection(pattern);
        console.log(patternDataData,isError,resultObj);
        if(isError)return resultObj;
        this.patternData.setData(false,patternDataData);
        //console.log(JSON.stringify(this.patternData.getData()));
        //console.log(patternDataData,isError,resultObj);
        //return{ isValid:null, message:null };
        if(this._isJugglableAsync(this._syncToAsync(patternDataData))){
            return this._result(true,true,null);
        }else{
            return this._result(true,false,"この数列は投げられません");
        }
    }
    
    /**
     * シンクロパターンの1セクションを検証
     * @private
     */
    _validateSyncSection(pattern){
        let patternDataData = [];
        let index = 0;
        pattern = pattern.slice(1, -1);
        const sectionList = pattern.split(/\)\(|,/);
        //console.log(JSON.stringify(sectionList));
        if(sectionList.includes(""))return[[],true,structuredClone(this._result(false,false,"括弧内に数値が存在しません1"))];
        //console.log(JSON.stringify(sectionList));
        for(let string of sectionList){
            let prefix = "#";
            if(string.includes("[")||string.includes("]")){
                if(["-", "/", "+"].includes(string[0])){
                    prefix = string[0];
                    string = string.slice(1);
                }
                if (string.startsWith('[') && string.endsWith(']')) {
                    // 最初と最後の文字を除いた部分を返す
                    string = string.slice(1, -1);
                    if(!string.length)return[[],true,structuredClone(this._result(false,false,"'[]'の中に数値が存在しません"))];
                }else{
                    return[[],true,structuredClone(this._result(false,false,"マルチの形式が正しくありません"))];
                }
                const numList = [...string].map(char => SiteswapProcessor.VALID_THROW_CHARS[char]);
                if(!numList.every(num => Number.isInteger(num)))return [[],true,structuredClone(this._result(false,false,"'[]'の中には数値またはクロス(x)のみ入力可能です"))];
                const stringList = string.toLowerCase().match(/[a-z0-9]x|[a-z0-9]/g);
                const multi = []
                for(const str of stringList){
                    if(SiteswapProcessor.VALID_THROW_CHARS[str[0]] % 2 !== 0)return[[],true,structuredClone(this._result(false,false,"シンクロサイトスワップでは奇数を使用できません"))];
                    if(str.length==2){
                        multi.push(Pattern.createNumData(SiteswapProcessor.VALID_THROW_CHARS[str[0]],index,true));//{num:SiteswapProcessor.VALID_THROW_CHARS[str[0]],isCross:true,index:index});
                    }else{
                        multi.push(Pattern.createNumData(SiteswapProcessor.VALID_THROW_CHARS[str[0]],index,false));
                    }
                    index++;
                }
                patternDataData.push(Pattern.createPatternData(prefix,multi));//{prefix:prefix,numObj:multi});
            }else{
                if(["-", "/", "+"].includes(string[0])){
                    if((string.toLowerCase().endsWith("x")&&string.length!==3)||(!string.toLowerCase().endsWith("x")&&string.length!==2))return[[],true,structuredClone(this._result(false,false,"括弧内のセクションが不正な形式です"))];
                    if(Number.isInteger(SiteswapProcessor.VALID_THROW_CHARS[string[1]])){
                        if(SiteswapProcessor.VALID_THROW_CHARS[string[1]] % 2 === 0){
                            //patternData.push({prefix:string[0],numObj:{num:SiteswapProcessor.VALID_THROW_CHARS[string[1]],isCross:string.toLowerCase().endsWith("x"),index:index}});
                            patternDataData.push(Pattern.createPatternData(string[0],[Pattern.createNumData(SiteswapProcessor.VALID_THROW_CHARS[string[1]],index,string.toLowerCase().endsWith("x"))]));
                        }else{
                            return[[],true,structuredClone(this._result(false,false,"シンクロサイトスワップでは奇数を使用できません"))];
                        }
                    }else{
                        return[[],true,structuredClone(this._result(false,false,"括弧内に数値が存在しません2"))];
                    }
                }else{
                    if((string.toLowerCase().endsWith("x")&&string.length!==2)||(!string.toLowerCase().endsWith("x")&&string.length!==1))return[[],true,structuredClone(this._result(false,false,"括弧内のセクションが不正な形式です"))];
                    if(Number.isInteger(SiteswapProcessor.VALID_THROW_CHARS[string[0]])){
                        if(SiteswapProcessor.VALID_THROW_CHARS[string[0]] % 2 === 0){
                            //patternData.push({prefix:"#",numObj:{num:SiteswapProcessor.VALID_THROW_CHARS[string[0]],isCross:string.toLowerCase().endsWith("x"),index:index}});
                            patternDataData.push(Pattern.createPatternData("#",[Pattern.createNumData(SiteswapProcessor.VALID_THROW_CHARS[string[0]],index,string.toLowerCase().endsWith("x"))]));//{prefix:"#",numObj:{num:SiteswapProcessor.VALID_THROW_CHARS[string[0]],isCross:string.toLowerCase().endsWith("x"),index:index}});
                        }else{
                            return[[],true,structuredClone(this._result(false,false,"シンクロサイトスワップでは奇数を使用できません"))];
                        }
                    }else{
                        return[[],true,structuredClone(this._result(false,false,"括弧内に数値が存在しません3"))];
                    }
                }
                index++;
            }
        }
        return [patternDataData,false,structuredClone(this._result(true,null,null))];
    }
    /**
     * シンクロパターンからアシンクロに変換
     * @private
     */
    _syncToAsync(patternDataData){
        //console.log(patternDataData);
        const checkDataAsync = [];
        for(let i = 0 ; i < patternDataData.length ; i++){
            const numDataList = patternDataData[i].numData;
            const multi = [];
            for(const numData of numDataList){
                if(numData.isCross&&i%2==0){
                    multi.push(numData.num+1);
                }else if(numData.isCross&&i%2==1){
                    multi.push(numData.num-1);
                }else{
                    multi.push(numData.num);
                }
            }
            checkDataAsync.push(Array.isArray(multi) && multi.length === 1 ? multi[0] : multi);
        }
        //console.log(checkDataAsync);
        return checkDataAsync;
    }
}