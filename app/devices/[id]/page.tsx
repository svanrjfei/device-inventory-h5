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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    devicesApi
      .get(id)
      .then((res) => {
        setD(res);
      })
      .catch(() => {
        setD(null);
        toast.error("加载失败");
      });
  }, [id]);

  if (!mounted)
    return (
      <div className="mx-auto max-w-xl px-0">
        <PageHeader title="设备信息" backHref="/ledger" />
        <div className="mx-4 text-sm text-neutral-400">加载中…</div>
        <div className="pb-28" />
      </div>
    );

  if (!d)
    return (
      <div className="mx-auto max-w-xl px-0">
        <PageHeader title="设备信息" backHref="/ledger" />
        <div className="mx-4 text-sm text-gray-600">未找到设备</div>
      </div>
    );

  function toggleMissing() {
    toast.promise(
      devicesApi.patch(d.id, { missing: !d.missing }).then((res) => {
        setD(res);
        return res;
      }),
      {
        loading: d.missing ? "设置为非缺失…" : "设置为缺失…",
        success: d.missing ? "已设为非缺失" : "已设为缺失",
        error: "更新失败",
      }
    );
  }

  return (
    <div className="mx-auto max-w-xl px-0">
      <PageHeader
        title={d.name}
        backHref="/ledger"
        subtitle={<span className="text-xs">编码 {d.code}</span>}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={toggleMissing}>
              <AlertTriangle size={16} className={d.missing ? 'text-red-500' : 'text-neutral-400'} />
              <span className="ml-1">{d.missing ? '设为非缺失' : '设为缺失'}</span>
            </Button>
            <a href={`/devices/${d.id}/edit`}>
              <Button size="sm">编辑</Button>
            </a>
          </>
        }
      />

      <div className="mx-4 space-y-3">
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white flex items-center justify-between">
            <div className="text-sm text-neutral-600 flex items-center gap-2">
              <BadgeInfo size={16} className="text-neutral-400" /> 基础信息
            </div>
            <span className="text-[11px] rounded-full px-2 py-0.5 border border-neutral-300 text-neutral-700 bg-neutral-50">{d.status}</span>
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center text-neutral-700"><Tag size={16} className="mr-1.5 text-neutral-400" />类别：{d.deviceType}</div>
              <div className="flex items-center text-neutral-700">单位：{d.unit ?? '—'}</div>
              <div className="flex items-center text-neutral-700"><DollarSign size={16} className="mr-1.5 text-neutral-400" />单价：{formatMoney(d.unitPrice)}</div>
              <div className="flex items-center text-neutral-700">数量：{d.quantity ?? '—'}</div>
              <div className="flex items-center text-neutral-700">金额：{formatMoney(d.totalPrice)}</div>
              <div className="flex items-center text-neutral-700">部门：{d.department ?? '—'}</div>
              <div className="col-span-2 flex items-center text-neutral-700"><MapPin size={16} className="mr-1.5 text-neutral-400" />位置：{d.location ?? '—'}</div>
              <div className="flex items-center text-neutral-700"><User size={16} className="mr-1.5 text-neutral-400" />保管：{d.keeper ?? '—'}</div>
              <div className="flex items-center text-neutral-700"><Calendar size={16} className="mr-1.5 text-neutral-400" />入库：{formatDate(d.storageAt)}</div>
              <div className="flex items-center text-neutral-700">用途：{d.usage ?? '—'}</div>
              <div className="flex items-center text-neutral-700">出厂：{d.factoryNumber ?? '—'}</div>
              <div className="flex items-center text-neutral-700">发票：{d.invoiceNumber ?? '—'}</div>
              <div className="flex items-center text-neutral-700">经费编号：{d.fundingCode ?? '—'}</div>
              <div className="flex items-center text-neutral-700">经费来源：{d.funding ?? '—'}</div>
              <div className="col-span-2 text-neutral-700">备注：{d.note ?? '—'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600 flex items-center gap-2">
            <BadgeInfo size={16} className="text-neutral-400" /> 记录
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-neutral-700">
              <div>创建：{formatDate(d.createdAt)}</div>
              <div>更新：{formatDate(d.updatedAt)}</div>
            </div>
          </div>
        </div>

        <div className="pb-28" />
      </div>
    </div>
  );
}
