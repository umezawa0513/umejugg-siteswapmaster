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
    static VERSION = "1.0.0";

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

        if (!CanvasRecorder.isSupported()) {
            button.disabled = true;
            button.title = 'このブラウザは WebCodecs / mp4-muxer 未対応のため利用できません';
        }

        button.addEventListener('click', async () => {
            const seconds = Number(select.value);
            try {
                await this.start(seconds, (progress) => {
                    button.textContent = `録画中... ${Math.floor(progress * 100)}%`;
                });
                button.textContent = '録画してMP4保存';
            } catch (err) {
                console.error('[CanvasRecorder] 録画失敗', err);
                button.textContent = '録画失敗';
                setTimeout(() => { button.textContent = '録画してMP4保存'; }, 2000);
            }
        });

        root.appendChild(select);
        root.appendChild(button);
        parent.appendChild(root);

        this._uiRoot = root;
        this._button = button;
        this._select = select;
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
        const width = this.canvas.width;
        const height = this.canvas.height;
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

        const encoder = new VideoEncoder({
            output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
            error: (e) => console.error('[CanvasRecorder] VideoEncoder error', e),
        });

        encoder.configure({
            codec: 'avc1.42E01F',       // H.264 Baseline 3.1 互換性が高い
            width,
            height,
            bitrate,
            framerate: fps,
            avc: { format: 'avc' },
        });

        // 一定間隔で canvas からフレームを取り出してエンコード
        const frameIntervalMs = 1000 / fps;
        let frameIndex = 0;

        await new Promise((resolve) => {
            const startTime = performance.now();
            const tick = () => {
                if (frameIndex >= totalFrames) {
                    resolve();
                    return;
                }

                const timestamp = frameIndex * frameDurationUs;
                const frame = new VideoFrame(this.canvas, { timestamp });
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
        muxer.finalize();

        return new Blob([muxer.target.buffer], { type: 'video/mp4' });
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
