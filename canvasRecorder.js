/**
 * CanvasRecorder
 *
 * 任意の <canvas> の描画内容を MP4 動画として保存するための汎用クラス。
 * WebCodecs (VideoEncoder) + mp4-muxer により H.264 MP4 を直接生成する。
 *
 * 依存:
 *   - mp4-muxer (CDN 経由で読み込む。グローバルに `Mp4Muxer` が存在する想定)
 *     例: <script src="https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/build/mp4-muxer.min.js"></script>
 *   - WebCodecs API (Chrome / Edge / Safari 16.4+ / Firefox 130+)
 *
 * 使い方の例:
 *   const recorder = new CanvasRecorder({ canvas: document.getElementById('canvas') });
 *   recorder.mount('#recorder-ui');   // UI（録画ボタン + 秒数セレクト）を任意要素に差し込む
 *   // もしくは API として直接:
 *   await recorder.start(10);          // 10 秒録画 → 自動で MP4 ダウンロード
 */
class CanvasRecorder {
    static VERSION = "1.1.0";

    /**
     * @param {Object} options
     * @param {HTMLCanvasElement|string} options.canvas - 対象 canvas 要素 or セレクタ
     * @param {number[]} [options.durations=[5,10,30]] - UI に表示する秒数の選択肢
     * @param {number} [options.fps=30] - 録画フレームレート
     * @param {number} [options.bitrate=4_000_000] - ビデオビットレート (bps)
     * @param {string} [options.fileName='canvas-recording'] - 拡張子を除くファイル名
     */
    constructor(options = {}) {
        this.options = {
            canvas: '#canvas',
            durations: [5, 10, 30],
            fps: 30,
            bitrate: 4_000_000,
            fileName: 'canvas-recording',
            ...options,
        };

        this.canvas = typeof this.options.canvas === 'string'
            ? document.querySelector(this.options.canvas)
            : this.options.canvas;

        if (!this.canvas) {
            throw new Error('[CanvasRecorder] canvas 要素が見つかりません');
        }

        this.isRecording = false;
        this._uiRoot = null;
        this._button = null;
        this._select = null;
    }

    /**
     * 現在のブラウザで利用可能か判定する。
     * @returns {boolean}
     */
    static isSupported() {
        return typeof window !== 'undefined'
            && typeof window.VideoEncoder === 'function'
            && typeof window.VideoFrame === 'function'
            && typeof window.Mp4Muxer !== 'undefined';
    }

    /**
     * 非対応の場合に、何が足りないかを示す日本語メッセージを返す。
     * @returns {string}
     */
    static unsupportedReason() {
        if (typeof window === 'undefined') return '実行環境が不正です';
        if (typeof window.VideoEncoder !== 'function' || typeof window.VideoFrame !== 'function') {
            return 'このブラウザは動画エンコード(WebCodecs)に未対応です。最新のブラウザでお試しください';
        }
        if (typeof window.Mp4Muxer === 'undefined') {
            return '録画ライブラリ(mp4-muxer)の読み込みに失敗しました。通信環境をご確認ください';
        }
        return '録画機能を利用できません';
    }

    /**
     * UI（録画ボタン + 秒数セレクト）を生成して指定要素に挿入する。
     * @param {string|HTMLElement} target - 挿入先（セレクタ or 要素）
     */
    mount(target) {
        const parent = typeof target === 'string' ? document.querySelector(target) : target;
        if (!parent) {
            console.warn('[CanvasRecorder] mount: 挿入先が見つかりません', target);
            return;
        }

        const root = document.createElement('div');
        root.className = 'canvas-recorder';

        const select = document.createElement('select');
        select.className = 'canvas-recorder__duration';
        for (const sec of this.options.durations) {
            const opt = document.createElement('option');
            opt.value = String(sec);
            opt.textContent = `${sec}秒`;
            select.appendChild(opt);
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'canvas-recorder__button';
        button.textContent = '録画してMP4保存';

        // スマホ等でコンソールが見られない環境向けに、エラーや状態を画面へ表示する領域
        const status = document.createElement('p');
        status.className = 'canvas-recorder__status';
        status.setAttribute('aria-live', 'polite');

        if (!CanvasRecorder.isSupported()) {
            button.disabled = true;
            const reason = CanvasRecorder.unsupportedReason();
            button.title = reason;
            status.textContent = reason;
        }

        button.addEventListener('click', async () => {
            const seconds = Number(select.value);
            status.textContent = '';
            button.disabled = true;
            try {
                await this.start(seconds, (progress) => {
                    button.textContent = `録画中... ${Math.floor(progress * 100)}%`;
                });
                button.textContent = '録画してMP4保存';
            } catch (err) {
                console.error('[CanvasRecorder] 録画失敗', err);
                button.textContent = '録画してMP4保存';
                // エラーメッセージを画面に出す（モバイルでの原因特定用）
                status.textContent = `録画失敗: ${err && err.message ? err.message : err}`;
            } finally {
                button.disabled = false;
            }
        });

        root.appendChild(select);
        root.appendChild(button);
        root.appendChild(status);
        parent.appendChild(root);

        this._uiRoot = root;
        this._button = button;
        this._select = select;
        this._status = status;
    }

    /**
     * 指定秒数だけ canvas を録画し、MP4 を自動ダウンロードする。
     * @param {number} seconds - 録画秒数
     * @param {(progress:number)=>void} [onProgress] - 0〜1 の進捗コールバック
     * @returns {Promise<Blob>} 生成された MP4 Blob
     */
    async start(seconds, onProgress) {
        if (this.isRecording) {
            throw new Error('既に録画中です');
        }
        if (!CanvasRecorder.isSupported()) {
            throw new Error('このブラウザでは録画機能を利用できません (WebCodecs / mp4-muxer 必要)');
        }
        if (!seconds || seconds <= 0) {
            throw new Error('録画秒数が不正です');
        }

        this.isRecording = true;
        try {
            const blob = await this._record(seconds, onProgress);
            this._download(blob);
            return blob;
        } finally {
            this.isRecording = false;
        }
    }

    /**
     * 録画本体。WebCodecs で 1 フレームずつエンコードし、mp4-muxer で MP4 化する。
     * @private
     */
    async _record(seconds, onProgress) {
        const { fps, bitrate } = this.options;
        // モバイルのハードウェアエンコーダは解像度が 2 の倍数でないと configure に失敗することがあるため偶数へ丸める
        const width = this.canvas.width - (this.canvas.width % 2);
        const height = this.canvas.height - (this.canvas.height % 2);
        const totalFrames = Math.round(seconds * fps);
        const frameDurationUs = Math.round(1_000_000 / fps); // マイクロ秒

        // mp4-muxer は CDN 版だと `window.Mp4Muxer` 配下に Muxer / ArrayBufferTarget を持つ
        const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;

        const muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
                codec: 'avc',          // H.264
                width,
                height,
                frameRate: fps,
            },
            fastStart: 'in-memory',    // moov を先頭に置き、Web 再生・共有しやすくする
        });

        // 対応する VideoEncoder 設定を選ぶ（端末によって対応コーデックや HW/SW が異なる）
        const config = await this._pickSupportedConfig({ width, height, bitrate, fps });

        let encoderError = null;
        const encoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => {
                // モバイルでは encode 中に非同期でエラーが出る。最初の 1 件を保持して後で投げる
                console.error('[CanvasRecorder] VideoEncoder error', e);
                if (!encoderError) encoderError = e;
            },
        });
        encoder.configure(config);

        // 一定間隔で canvas からフレームを取り出してエンコード
        const frameIntervalMs = 1000 / fps;
        let frameIndex = 0;

        await new Promise((resolve, reject) => {
            const startTime = performance.now();
            const tick = () => {
                // 非同期エンコードエラーが出ていたら中断
                if (encoderError) {
                    reject(encoderError);
                    return;
                }
                if (frameIndex >= totalFrames) {
                    resolve();
                    return;
                }
                // エンコーダのキューが詰まっている場合はフレーム投入を控え、処理が進むのを待つ
                // (非力なスマホでキューが溢れてクラッシュするのを防ぐ)
                if (encoder.encodeQueueSize > fps) {
                    setTimeout(tick, frameIntervalMs);
                    return;
                }

                const timestamp = frameIndex * frameDurationUs;
                const frame = new VideoFrame(this.canvas, { timestamp, duration: frameDurationUs });
                // keyFrame を定期的に挿入（先頭 + 約 2 秒ごと）
                const keyFrame = (frameIndex % (fps * 2)) === 0;
                encoder.encode(frame, { keyFrame });
                frame.close();

                frameIndex++;
                if (onProgress) onProgress(frameIndex / totalFrames);

                // 次フレームを実時間に合わせて待つ（canvas のアニメーションを進行させるため）
                const nextAt = startTime + frameIndex * frameIntervalMs;
                const delay = Math.max(0, nextAt - performance.now());
                setTimeout(tick, delay);
            };
            tick();
        });

        await encoder.flush();
        encoder.close();
        if (encoderError) throw encoderError;
        muxer.finalize();

        return new Blob([muxer.target.buffer], { type: 'video/mp4' });
    }

    /**
     * 端末が対応する VideoEncoder 設定を順に試して、最初に対応した設定を返す。
     * H.264 のプロファイルや HW/SW アクセラレーションの対応は端末差が大きいため、
     * 互換性の高い順にフォールバックする。
     * @private
     * @returns {Promise<VideoEncoderConfig>}
     */
    async _pickSupportedConfig({ width, height, bitrate, fps }) {
        const base = { width, height, bitrate, framerate: fps, avc: { format: 'avc' } };
        // 上から順に試す: Baseline → Main → 高プロファイル / さらに SW エンコードへフォールバック
        const candidates = [
            { ...base, codec: 'avc1.42E01F' },                                       // Baseline 3.1
            { ...base, codec: 'avc1.4D401F' },                                       // Main 3.1
            { ...base, codec: 'avc1.640028' },                                       // High 4.0
            { ...base, codec: 'avc1.42E01F', hardwareAcceleration: 'prefer-software' },
            { ...base, codec: 'avc1.4D401F', hardwareAcceleration: 'prefer-software' },
        ];

        for (const cfg of candidates) {
            try {
                const support = await VideoEncoder.isConfigSupported(cfg);
                if (support && support.supported) {
                    return support.config || cfg;
                }
            } catch (_) {
                // isConfigSupported 自体が投げる端末もあるので次の候補へ
            }
        }
        throw new Error('この端末では対応する動画形式が見つかりませんでした (H.264 非対応の可能性)');
    }

    /**
     * Blob をブラウザでダウンロード。
     * @private
     */
    _download(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `${this.options.fileName}-${stamp}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // メモリ解放（少し遅らせて確実にダウンロード開始させる）
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

// グローバル公開（モジュール非対応の素の <script> 読み込みでも使えるように）
if (typeof window !== 'undefined') {
    window.CanvasRecorder = CanvasRecorder;
}
