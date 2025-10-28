"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/header";

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSearch() {
    const v = q.trim();
    if (!v) return;
    router.push(`/search/results?q=${encodeURIComponent(v)}`);
  }

  return (
    <div className="mx-auto max-w-xl px-0">
      <PageHeader title="查询" />
      <div className="mx-4 rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="设备码/名称/型号/保管人"
            className="w-full rounded-md border px-3 py-2"
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
          <button onClick={onSearch} className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800">
            搜索
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          小贴士：可直接输入“1604761D”或“减压阀”。
        </div>
      </div>
      <div className="pb-24" />
    </div>
  );
}
