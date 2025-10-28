"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { devicesApi } from "@/lib/api";
import { toast } from "sonner";
import { BrowserMultiFormatReader, DecodeHintType, NotFoundException, BarcodeFormat } from "@zxing/library";
import { PageHeader } from "@/components/ui/header";

type ScanMode = "auto" | "1d" | "2d";

const FORMATS_2D = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.AZTEC,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
];
const FORMATS_1D = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
];

function getFormats(mode: ScanMode) {
  if (mode === "1d") return FORMATS_1D;
  if (mode === "2d") return FORMATS_2D;
  return [...FORMATS_2D, ...FORMATS_1D];
}

function buildHints(mode: ScanMode) {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, getFormats(mode));
  hints.set(DecodeHintType.TRY_HARDER, true);
  try { hints.set(((DecodeHintType as any).ALSO_INVERTED as any), true as any); } catch {}
  try { hints.set(((DecodeHintType as any).ASSUME_GS1 as any), true as any); } catch {}
  return hints;
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [active, setActive] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [mode, setMode] = useState<ScanMode>("auto");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    return () => {
      stopScan();
    };
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

    const reader = new BrowserMultiFormatReader(buildHints(mode), 300);
    readerRef.current = reader;

    try {
      const constraintsList: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 960 }, height: { ideal: 540 } }, audio: false },
        { video: { facingMode: { ideal: "environment" } }, audio: false },
      ];

      let started = false;
      for (const cs of constraintsList) {
        try {
          await reader.decodeFromConstraints(
            cs,
            video,
            (result, err) => {
              if (result) {
                onDetected(result.getText());
              } else if (err && !(err instanceof NotFoundException)) {
                setMsg(String(err));
              }
            }
          );
          started = true;
          break;
        } catch {
          try { reader.reset(); } catch {}
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
    } catch (e: any) {
      setPermissionError(e?.message || "无法访问摄像头，请检查权限或使用查询页");
      setActive(false);
    }
  }

  function stopScan() {
    try { readerRef.current?.stopContinuousDecode(); } catch {}
    readerRef.current?.reset();
    readerRef.current = null;
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
    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader(buildHints("auto"));
      const result = await reader.decodeFromImageUrl(url);
      if (result?.getText) onDetected(result.getText());
    } catch (err: any) {
      setError(err?.message || "识别失败，可尝试更清晰/更大条码图片");
    } finally {
      URL.revokeObjectURL(url);
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

