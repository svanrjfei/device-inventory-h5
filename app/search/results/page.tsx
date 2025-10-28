"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { DeviceDTO } from "@/lib/types";
import { devicesApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function DeviceCard({ d, onToggle, onRestore, onMarkMissing }: { d: DeviceDTO; onToggle?: (id:number)=>void; onRestore: (dev: DeviceDTO) => void; onMarkMissing: (id:number)=>void }) {
  return (
    <Card className="overflow-hidden cursor-pointer" onClick={(e)=>{
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      window.location.href = `/devices/${d.id}`;
    }}>
      <CardHeader className="bg-gradient-to-r from-neutral-50 to-white">
        <div className="flex items-center justify-between">
          <div className="font-medium truncate">{d.name} <span className="ml-2 text-xs text-neutral-500">{d.code}</span></div>
          <span className="text-[11px] rounded-full px-2 py-0.5 border border-neutral-300 text-neutral-700 bg-neutral-50">{d.status}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-1 text-sm text-neutral-700">型号：{d.model ?? '—'}</div>
        <div className="mt-1 flex items-center text-sm text-neutral-700">
          <MapPin size={16} className="mr-1.5 text-neutral-400" />
          <span className="truncate">{d.location ?? '—'}</span>
        </div>
        <div className="mt-1 flex items-center text-sm text-neutral-700">
          <User size={16} className="mr-1.5 text-neutral-400" />
          <span>{d.keeper ?? '—'}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-neutral-600 flex items-center gap-1">
            <AlertTriangle size={16} className={cn(d.missing ? 'text-red-500' : 'text-neutral-400')} />
            缺失：{d.missing ? '是' : '否'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (d.missing) onRestore(d); else onMarkMissing(d.id);
            }}
          >
            {d.missing ? '非缺失' : '缺失'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResultsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const [list, setList] = useState<DeviceDTO[]>([]);
  const [mounted, setMounted] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreDevice, setRestoreDevice] = useState<DeviceDTO | null>(null);
  const [restoreLocation, setRestoreLocation] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    devicesApi
      .list({ search: q, sort: 'updatedAt:desc', offset: 0, limit: 50 })
      .then((res) => {
        setList(res.items);
      })
      .catch(() => {
        setList([]);
        toast.error("加载失败");
      });
  }, [mounted, q]);

  async function toggleMissing(id: number) {
    toast.promise(
      devicesApi.patch(id, { missing: true }).then((updated) => {
        setList((prev) => prev.map((d) => (d.id === id ? updated : d)));
        return updated;
      }),
      { loading: "更新中…", success: "已设为缺失", error: "更新失败" }
    );
  }

  function openRestore(dev: DeviceDTO) {
    setRestoreDevice(dev);
    setRestoreLocation(dev.location ?? "");
    setRestoreOpen(true);
  }

  async function submitRestore() {
    if (!restoreDevice) return;
    toast.promise(
      devicesApi.patch(restoreDevice.id, { missing: false, location: restoreLocation || null }).then((updated) => {
        setList((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setRestoreOpen(false);
        setRestoreDevice(null);
        return updated;
      }),
      { loading: "更新中…", success: "已设为非缺失", error: "更新失败" }
    );
  }

  const title = useMemo(() => (q ? `查询结果（关键字：${q}）` : '查询结果'), [q]);

  return (
    <div className="mx-auto max-w-xl px-0">
      <PageHeader title={title} backHref="/search" />
      <div className="mx-4 space-y-3 pb-24">
        {!mounted ? (
          <div className="text-sm text-neutral-400">加载中…</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-gray-600">未找到相关设备</div>
        ) : (
          list.map((d) => (
            <DeviceCard
              key={d.id}
              d={d}
              onToggle={(id) => toggleMissing(id)}
              // enhance: when currently missing, ask for location
              onRestore={openRestore}
              onMarkMissing={(id) => toggleMissing(id)}
            />
          ))
        )}
      </div>

      {/* 恢复为非缺失时的位置信息弹窗 */}
      {restoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRestoreOpen(false)} />
          <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-lg p-4 mx-auto">
            <div className="mb-2 text-base font-medium">更新存放位置</div>
            <div className="text-xs text-neutral-500 mb-3">
              {restoreDevice?.name} <span className="text-neutral-400">({restoreDevice?.code})</span>
            </div>
            <label className="block text-sm text-neutral-700 mb-1">存放位置</label>
            <input
              value={restoreLocation}
              onChange={(e) => setRestoreLocation(e.target.value)}
              placeholder="请输入设备当前的存放位置"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRestoreOpen(false)}>取消</Button>
              <Button size="sm" onClick={submitRestore}>提交</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
