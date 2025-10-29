"use client";
import { useParams, useRouter } from "next/navigation";
import { devicesApi } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BadgeInfo, MapPin, User, Calendar, DollarSign, Tag } from "lucide-react";
import { toast } from "sonner";

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backHref, setBackHref] = useState<string>("/ledger");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreLocation, setRestoreLocation] = useState("");

  useEffect(() => {
    setLoading(true);
    try {
      const src = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("src") : null;
      if (src === "scan") setBackHref("/scan");
    } catch {}
    devicesApi
      .get(id)
      .then((res) => setD(res))
      .catch(() => {
        setD(null);
        toast.error("查询失败");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-0">
        <PageHeader title="设备信息" backHref={backHref} />
        <div className="mx-4 space-y-3 animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
        <div className="pb-28" />
      </div>
    );
  }

  if (!d) {
    return (
      <div className="mx-auto max-w-xl px-0">
        <PageHeader title="设备信息" backHref={backHref} />
        <div className="mx-4 mt-4 text-sm text-gray-600">未找到设备</div>
      </div>
    );
  }

  function toggleMissing() {
    if (!d) return;
    if (d.missing) {
      setRestoreLocation(d.location ?? "");
      setRestoreOpen(true);
      return;
    }
    toast.promise(
      devicesApi.patch(d.id, { missing: true }).then((res) => { setD(res); return res; }),
      { loading: "标记为缺失中…", success: "已标记为缺失", error: "操作失败" }
    );
  }

  function doDelete() {
    if (!d) return;
    try {
      const ok = window.confirm(`确定删除设备“${d.name}(${d.code})”？此操作不可撤销。`);
      if (!ok) return;
    } catch {}
    toast.promise(
      devicesApi.remove(d.id).then(() => {
        router.push('/ledger');
      }),
      { loading: '删除中…', success: '已删除', error: '删除失败' }
    );
  }

  return (
    <div className="mx-auto max-w-xl px-0">
      <PageHeader
        title={d.name}
        backHref={backHref}
        subtitle={<span className="text-xs">{"\u7F16\u7801"} {d.code}</span>}
      />
      <div className="px-4 -mt-1 pb-2 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={toggleMissing}>
          <AlertTriangle size={16} className={d.missing ? 'text-red-500' : 'text-neutral-400'} />
          <span className="ml-1">{d.missing ? "\u6539\u4E3A\u4E0D\u7F3A\u5931" : "\u6807\u4E3A\u7F3A\u5931"}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={doDelete} className="text-red-600 border-red-300 hover:bg-red-50">{"\u5220\u9664"}</Button>
        <a href={`/devices/${d.id}/edit`}>
          <Button size="sm">{"\u7F16\u8F91"}</Button>
        </a>
      </div>

      <div className="mx-4 space-y-3">
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white flex items-center justify-between">
            <div className="text-sm text-neutral-600 flex items-center gap-2">
              <BadgeInfo size={16} className="text-neutral-400" /> {"\u57FA\u672C\u4FE1\u606F"}
            </div>
            <span className="text-[11px] rounded-full px-2 py-0.5 border border-neutral-300 text-neutral-700 bg-neutral-50">{d.status}</span>
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center text-neutral-700"><Tag size={16} className="mr-1.5 text-neutral-400" />{"\u7C7B\u578B\uFF1A"}{d.deviceType}</div>
              <div className="flex items-center text-neutral-700">{"\u5355\u4F4D\uFF1A"}{d.unit ?? "\u65E0"}</div>
              <div className="flex items-center text-neutral-700"><DollarSign size={16} className="mr-1.5 text-neutral-400" />{"\u5355\u4EF7\uFF1A"}{formatMoney(d.unitPrice)}</div>
              <div className="flex items-center text-neutral-700">{"\u6570\u91CF\uFF1A"}{d.quantity ?? "\u65E0"}</div>
              <div className="flex items-center text-neutral-700">{"\u603B\u4EF7\uFF1A"}{formatMoney(d.totalPrice)}</div>
              <div className="flex items-center text-neutral-700">{"\u90E8\u95E8\uFF1A"}{d.department ?? "\u65E0"}</div>
              <div className="col-span-2 flex items-center text-neutral-700"><MapPin size={16} className="mr-1.5 text-neutral-400" />{"\u4F4D\u7F6E\uFF1A"}{d.location ?? "\u65E0"}</div>
              <div className="flex items-center text-neutral-700"><User size={16} className="mr-1.5 text-neutral-400" />{"\u4FDD\u7BA1\u4EBA\uFF1A"}{d.keeper ?? "\u65E0"}</div>
              <div className="flex items-center text-neutral-700"><Calendar size={16} className="mr-1.5 text-neutral-400" />{"\u5165\u5E93\uFF1A"}{formatDate(d.storageAt)}</div>
              <div className="flex items-center text-neutral-700">{"\u7528\u9014\uFF1A"}{d.usage ?? "\u65E0"}</div>
              <div className="flex items-center text-neutral-700">{"\u51FA\u5382\u7F16\u53F7\uFF1A"}{d.factoryNumber ?? "\u65E0"}</div>
              <div className="flex items-center text-neutral-700">{"\u53D1\u7968\u53F7\uFF1A"}{d.invoiceNumber ?? "\u65E0"}</div>
              <div className="flex items-center text-neutral-700">{"\u7ECF\u8D39\u7F16\u53F7\uFF1A"}{d.fundingCode ?? "\u65E0"}</div>
              <div className="flex items-center text-neutral-700">{"\u7ECF\u8D39\u6765\u6E90\uFF1A"}{d.funding ?? "\u65E0"}</div>
              <div className="col-span-2 text-neutral-700">{"\u5907\u6CE8\uFF1A"}{d.note ?? "\u65E0"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600 flex items-center gap-2">
            <BadgeInfo size={16} className="text-neutral-400" /> {"\u8BB0\u5F55"}
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-neutral-700">
              <div>{"\u521B\u5EFA\u4E8E\uFF1A"}{formatDate(d.createdAt)}</div>
              <div>{"\u66F4\u65B0\u4E8E\uFF1A"}{formatDate(d.updatedAt)}</div>
          </div>
        </div>

        <div className="pb-28" />

        {restoreOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setRestoreOpen(false)} />
            <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-lg p-4 mx-auto">
              <div className="mb-2 text-base font-medium">{"\u786E\u8BA4\u6062\u590D\u4F4D\u7F6E"}</div>
              <div className="text-xs text-neutral-500 mb-3">
                {d?.name} <span className="text-neutral-400">({d?.code})</span>
              </div>
              <label className="block text-sm text-neutral-700 mb-1">{"\u6062\u590D\u4F4D\u7F6E"}</label>
              <input
                value={restoreLocation}
                onChange={(e) => setRestoreLocation(e.target.value)}
                placeholder="请输入该设备当前的恢复位置"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRestoreOpen(false)}>取消</Button>
                <Button size="sm" onClick={() => {
                  if (!d) return;
                  toast.promise(
                    devicesApi.patch(d.id, { missing: false, location: restoreLocation || null }).then((res) => { setD(res); setRestoreOpen(false); return res; }),
                    { loading: '处理中…', success: '已改为不缺失', error: '操作失败' }
                  );
                }}>应用</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


