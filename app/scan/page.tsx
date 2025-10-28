"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { devicesApi } from "@/lib/api";
import { toast } from "sonner";
import { readBarcodesFromImageData, readBarcodesFromImageFile, defaultReaderOptions, prepareZXingModule, linearBarcodeFormats } from "zxing-wasm/reader";
import { PageHeader } from "@/components/ui/header";

type ScanMode = "auto" | "1d" | "2d";

// 二维码默认仅启用 QRCode 以提升识别速度
const FORMATS_2D = ["QRCode"] as const;
const FORMATS_1D = linearBarcodeFormats as string[];

function getFormats(mode: ScanMode): string[] {
  if (mode === "1d") return FORMATS_1D as string[];
  if (mode === "2d") return [...FORMATS_2D];
  return [...FORMATS_2D, ...FORMATS_1D];
}

function buildOptions(mode: ScanMode) {
  const opts: any = { ...defaultReaderOptions };
  opts.formats = getFormats(mode);
  opts.tryHarder = true;
  opts.tryRotate = true;
  opts.tryInvert = true;
  opts.maxNumberOfSymbols = 1;
  opts.downscaleFactor = 3;
  return opts;
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanningRef = useRef<{ stop: boolean } | null>(null);
  const [active, setActive] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [mode, setMode] = useState<ScanMode>("2d");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    // 预加载 wasm 减少首次识别延迟
    try { prepareZXingModule({ fireImmediately: true } as any); } catch {}
    return () => { stopScan(); };
  }, []);

  function onDetected(text: string) {
    stopScan();
    handleCode(text);
  }

  async function handleCode(raw: string) {
    const code = raw.trim();
    if (!code) return;
    try {
      const res = await devicesApi.list({ code, limit: 20 });
      if (res.items.length === 1) {
        router.push(`/devices/${res.items[0].id}`);
        return;
      }
      if (res.items.length > 1) {
        router.push(`/search/results?q=${encodeURIComponent(code)}`);
        return;
      }
      const fuzzy = await devicesApi.list({ search: code, limit: 20 });
      if (fuzzy.items.length === 1) {
        router.push(`/devices/${fuzzy.items[0].id}`);
      } else if (fuzzy.items.length > 1) {
        router.push(`/search/results?q=${encodeURIComponent(code)}`);
      } else {
        setMsg("未找到相关设备，可前往查询页试试");
        toast.error("未找到相关设备");
      }
    } catch (e: any) {
      setMsg(e?.message || "查询失败");
      toast.error("查询失败");
    }
  }

  async function startScan() {
    if (active) return;
    setMsg(null);
    setPermissionError(null);
    const video = videoRef.current;
    if (!video) return;

    const hasMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function";
    const isSecure = typeof window !== "undefined" && (window.isSecureContext || location.hostname === "localhost");
    if (!hasMedia || !isSecure) {
      setPermissionError("当前环境不支持摄像头访问，请在 HTTPS 或 localhost 打开，或使用下方相册识别。");
      return;
    }

    try {
      const constraintsList: MediaStreamConstraints[] = [
        { video: { facingMode: { exact: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: { exact: "environment" } }, audio: false },
        { video: { facingMode: { ideal: "environment" } }, audio: false },
      ];

      let started = false;
      for (const cs of constraintsList) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(cs);
          video.srcObject = stream;
          await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => {
              video.play().then(() => resolve()).catch(() => resolve());
            };
          });
          started = true; break;
        } catch {
          // try next
        }
      }
      if (!started) throw new Error("无法启动摄像头");
      setActive(true);

      try {
        const stream = (videoRef.current?.srcObject ?? null) as MediaStream | null;
        const track = stream?.getVideoTracks?.()[0];
        const caps: any = track?.getCapabilities?.();
        const supportsTorch = !!caps?.torch;
        setTorchSupported(supportsTorch);
        if (supportsTorch && torchOn) {
          await (track as any).applyConstraints({ advanced: [{ torch: true }] });
        }
      } catch {}

      // 启动扫描循环
      const state = { stop: false }; scanningRef.current = state;
      const opts: any = buildOptions(mode);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const loop = async () => {
        if (state.stop) return;
        try {
          const w = (video as HTMLVideoElement).videoWidth | 0; const h = (video as HTMLVideoElement).videoHeight | 0;
          if (w && h && ctx) {
            canvas.width = w; canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const results = await readBarcodesFromImageData(imageData as any, opts);
            if (results && results.length) {
              const text = (results[0] as any).text || "";
              if (text) { onDetected(text); return; }
            }
          }
        } catch {}
        setTimeout(loop, 120);
      };
      loop();
    } catch (e: any) {
      setPermissionError(e?.message || "无法访问摄像头，请检查权限或使用查询页");
      setActive(false);
    }
  }

  function stopScan() {
    if (scanningRef.current) scanningRef.current.stop = true;
    try {
      const stream = (videoRef.current?.srcObject ?? null) as MediaStream | null;
      stream?.getTracks?.().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
    setActive(false);
  }

  return (
    <div className="mx-auto max-w-xl px-0">
      <PageHeader title="扫码" />
      <div className="mx-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <label className="text-neutral-600">识别类型</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ScanMode)}
            className="h-9 rounded-md border px-2"
            disabled={active}
          >
            <option value="auto">自动</option>
            <option value="1d">一维码</option>
            <option value="2d">二维码</option>
          </select>
          {torchSupported && (
            <button
              onClick={async () => {
                const next = !torchOn;
                setTorchOn(next);
                try {
                  const stream = (videoRef.current?.srcObject ?? null) as MediaStream | null;
                  const track = stream?.getVideoTracks?.()[0];
                  if (track && (track as any).applyConstraints) {
                    await (track as any).applyConstraints({ advanced: [{ torch: next }] });
                  }
                } catch {}
              }}
              className="ml-auto rounded-md border px-3 py-1.5 hover:bg-gray-50"
            >
              {torchOn ? "关闭闪光灯" : "开启闪光灯"}
            </button>
          )}
        </div>
        <div className="relative w-full overflow-hidden rounded-md border bg-black">
          <video ref={videoRef} className="block w-full h-[320px] object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 border-2 border-emerald-400/90 shadow-[0_0_30px_rgba(16,185,129,0.4)]"></div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {!active ? (
            <button onClick={startScan} className="flex-1 rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800">开始扫码</button>
          ) : (
            <button onClick={stopScan} className="flex-1 rounded-md border px-4 py-2 hover:bg-gray-50">停止</button>
          )}
          <a href="/search" className="rounded-md border px-4 py-2 hover:bg-gray-50">去查询</a>
        </div>
        <AlbumFallback onDetected={onDetected} />
        {permissionError && <p className="mt-3 text-sm text-amber-600">{permissionError}</p>}
        {msg && <p className="mt-2 text-sm text-amber-600">{msg}</p>}
        <p className="mt-3 text-xs text-gray-500">注意：需在 HTTPS 或 localhost 环境并授予摄像头权限。</p>
      </div>
      <div className="pb-24" />
    </div>
  );
}

function AlbumFallback({ onDetected }: { onDetected: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const results = await readBarcodesFromImageFile(file, (buildOptions("auto") as any));
      if (results && results.length) {
        onDetected((results[0] as any).text || "");
      } else {
        setError("未识别到有效条码/二维码");
      }
    } catch (err: any) {
      setError(err?.message || "识别失败，可尝试更清晰/更大条码图片");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm hover:file:bg-gray-100"
        />
        {busy && <span className="text-xs text-gray-500">识别中…</span>}
      </div>
      {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">也可拍照/选择包含设备码的图片进行识别</p>
    </div>
  );
}
