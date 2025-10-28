"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { devicesApi } from "@/lib/api";
import { BrowserMultiFormatReader, DecodeHintType, NotFoundException, BarcodeFormat } from "@zxing/library";
// 支持二维码与常见一维码（条形码）
const SUPPORTED_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.AZTEC,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  // 一维码（条形码）
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

function buildHints() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}
import { PageHeader } from "@/components/ui/header";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [active, setActive] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

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
        setMsg("未找到相关设备，可尝试前往查询页");
      }
    } catch (e: any) {
      setMsg(e?.message || '查询失败');
    }
  }

  async function startScan() {
    if (active) return;
    setMsg(null);
    setPermissionError(null);
    const video = videoRef.current;
    if (!video) return;

    // Feature detection: require secure context + mediaDevices API
    const hasMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
    const isSecure = typeof window !== 'undefined' && (window.isSecureContext || location.hostname === 'localhost');
    if (!hasMedia || !isSecure) {
      setPermissionError('当前环境不支持摄像头访问，请在 HTTPS 或 localhost 中打开，或使用下方“相册识别”。');
      return;
    }

    const reader = new BrowserMultiFormatReader(buildHints(), 200);
    readerRef.current = reader;

    try {
      await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        video,
        (result, err) => {
          if (result) {
            onDetected(result.getText());
          } else if (err && !(err instanceof NotFoundException)) {
            setMsg(String(err));
          }
        }
      );
      setActive(true);
    } catch (e: any) {
      setPermissionError(e?.message || "无法访问摄像头，请在浏览器中允许相机权限或使用查询页");
      setActive(false);
    }
  }

  function stopScan() {
    try {
      readerRef.current?.stopContinuousDecode();
    } catch {}
    readerRef.current?.reset();
    readerRef.current = null;
    setActive(false);
  }

  return (
    <div className="mx-auto max-w-xl px-0">
      <PageHeader title="扫码" />
      <div className="mx-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="relative w-full overflow-hidden rounded-md border bg-black">
          <video ref={videoRef} className="block w-full h-[320px] object-cover" muted playsInline />
          {/* overlay */}
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
        <p className="mt-3 text-xs text-gray-500">在 HTTPS 或 localhost 环境下授权相机权限，优先使用后置摄像头。</p>
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
      const reader = new BrowserMultiFormatReader(buildHints());
      const result = await reader.decodeFromImageUrl(url);
      if (result?.getText) onDetected(result.getText());
    } catch (err: any) {
      setError(err?.message || '识别失败，请重试或更换更清晰图片');
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
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
      <p className="mt-2 text-xs text-gray-500">相册识别：拍照/选取包含设备码的图片进行识别。</p>
    </div>
  );
}
