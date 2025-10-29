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
        <PageHeader title={"设备信息"} backHref={backHref} />
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
        <PageHeader title={"设备信息"} backHref={backHref} />
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
        subtitle={<span className="text-xs">编码 {d.code}</span>}
      />
      <div className="px-4 -mt-1 pb-2 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={toggleMissing}>
          <AlertTriangle size={16} className={d.missing ? 'text-red-500' : 'text-neutral-400'} />
          <span className="ml-1">{d.missing ? '改为不缺失' : '标为缺失'}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={doDelete} className="text-red-600 border-red-300 hover:bg-red-50">删除</Button>
        <a href={`/devices/${d.id}/edit`}>
          <Button size="sm">编辑</Button>
        </a>
      </div>

      <div className="mx-4 space-y-3">
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white flex items-center justify-between">
            <div className="text-sm text-neutral-600 flex items-center gap-2">
              <BadgeInfo size={16} className="text-neutral-400" /> 基本信息
            </div>
            <span className="text-[11px] rounded-full px-2 py-0.5 border border-neutral-300 text-neutral-700 bg-neutral-50">{d.status}</span>
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center text-neutral-700"><Tag size={16} className="mr-1.5 text-neutral-400" />类型：{d.deviceType}</div>
              <div className="flex items-center text-neutral-700">单位：{d.unit ?? '无'}</div>
              <div className="flex items-center text-neutral-700"><DollarSign size={16} className="mr-1.5 text-neutral-400" />单价：{formatMoney(d.unitPrice)}</div>
              <div className="flex items-center text-neutral-700">数量：{d.quantity ?? '无'}</div>
              <div className="flex items-center text-neutral-700">总价：{formatMoney(d.totalPrice)}</div>
              <div className="flex items-center text-neutral-700">部门：{d.department ?? '无'}</div>
              <div className="col-span-2 flex items-center text-neutral-700"><MapPin size={16} className="mr-1.5 text-neutral-400" />位置：{d.location ?? '无'}</div>
              <div className="flex items-center text-neutral-700"><User size={16} className="mr-1.5 text-neutral-400" />保管人：{d.keeper ?? '无'}</div>
              <div className="flex items-center text-neutral-700"><Calendar size={16} className="mr-1.5 text-neutral-400" />入库：{formatDate(d.storageAt)}</div>
              <div className="flex items-center text-neutral-700">用途：{d.usage ?? '无'}</div>
              <div className="flex items-center text-neutral-700">出厂编号：{d.factoryNumber ?? '无'}</div>
              <div className="flex items中心 text-neutral-700">发票号：{d.invoiceNumber ?? '无'}</div>
              <div className="flex items-center text-neutral-700">经费编号：{d.fundingCode ?? '无'}</div>
              <div className="flex items-center text-neutral-700">经费来源：{d.funding ?? '无'}</div>
              <div className="col-span-2 text-neutral-700">备注：{d.note ?? '无'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg白 shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600 flex items-center gap-2">
            <BadgeInfo size={16} className="text-neutral-400" /> 记录
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-neutral-700">
              <div>创建于：{formatDate(d.createdAt)}</div>
              <div>更新于：{formatDate(d.updatedAt)}</div>
            </div>
          </div>
        </div>

        <div className="pb-28" />

        {restoreOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setRestoreOpen(false)} />
            <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-lg p-4 mx-auto">
              <div className="mb-2 text-base font-medium">确认恢复位置</div>
              <div className="text-xs text-neutral-500 mb-3">
                {d?.name} <span className="text-neutral-400">({d?.code})</span>
              </div>
              <label className="block text-sm text-neutral-700 mb-1">恢复位置</label>
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

