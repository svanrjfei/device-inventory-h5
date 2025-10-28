"use client";
import { useParams, useRouter } from "next/navigation";
import { mockApi, DeviceDTO } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DeviceEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const origin = mockApi.getById(id);
  const [form, setForm] = useState<DeviceDTO | null>(origin ?? null);

  useEffect(() => {
    setForm(mockApi.getById(id) ?? null);
  }, [id]);

  if (!form)
    return (
      <div className="mx-auto max-w-xl px-0">
        <PageHeader title="编辑设备信息" back />
        <div className="mx-4 text-sm text-gray-600">未找到设备</div>
      </div>
    );

  function onChange<K extends keyof DeviceDTO>(key: K, val: DeviceDTO[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: val } as DeviceDTO : prev));
  }

  function save() {
    const patch: Partial<DeviceDTO> = {
      name: form.name,
      model: form.model,
      status: form.status,
      missing: form.missing,
      unit: form.unit,
      unitPrice: form.unitPrice,
      totalPrice: form.totalPrice,
      quantity: form.quantity,
      department: form.department,
      location: form.location,
      keeper: form.keeper,
      storageAt: form.storageAt,
      usage: form.usage,
      factoryNumber: form.factoryNumber,
      invoiceNumber: form.invoiceNumber,
      fundingCode: form.fundingCode,
      funding: form.funding,
      note: form.note,
    };
    mockApi.update(form.id, patch);
    router.push(`/devices/${form.id}`);
  }

  return (
    <div className="mx-auto max-w-xl px-0">
      <PageHeader title="编辑设备信息" back subtitle={<span className="text-xs">{form.name} · {form.code}</span>} />
      <div className="mx-4 space-y-4">
        {/* 基础信息 */}
        <Card>
          <CardHeader className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600">基础信息</CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <label className="col-span-2">名称
                <input value={form.name} onChange={(e)=>onChange('name', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label>编码（只读）
                <input value={form.code} readOnly className="mt-1 w-full h-10 rounded-md border bg-gray-50 px-3 text-sm" />
              </label>
              <label>型号
                <input value={form.model ?? ''} onChange={(e)=>onChange('model', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label>状态
                <select value={form.status} onChange={(e)=>onChange('status', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm">
                  <option value="在用">在用</option>
                  <option value="闲置">闲置</option>
                  <option value="报废">报废</option>
                </select>
              </label>
              <label>是否缺失
                <select value={form.missing ? '1':'0'} onChange={(e)=>onChange('missing', e.target.value==='1')} className="mt-1 w-full h-10 rounded-md border px-3 text-sm">
                  <option value="0">否</option>
                  <option value="1">是</option>
                </select>
              </label>
              <label>单位
                <input value={form.unit ?? ''} onChange={(e)=>onChange('unit', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label>数量
                <input value={form.quantity ?? 0} onChange={(e)=>onChange('quantity', Number(e.target.value)||0)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label className="col-span-2">位置
                <input value={form.location ?? ''} onChange={(e)=>onChange('location', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label>保管
                <input value={form.keeper ?? ''} onChange={(e)=>onChange('keeper', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label>入库日期
                <input value={form.storageAt ?? ''} onChange={(e)=>onChange('storageAt', e.target.value)} type="date" className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label className="col-span-2">用途
                <input value={form.usage ?? ''} onChange={(e)=>onChange('usage', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 财务信息 */}
        <Card>
          <CardHeader className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600">财务信息</CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <label>单价
                <input value={form.unitPrice} onChange={(e)=>onChange('unitPrice', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label>金额
                <input value={form.totalPrice} onChange={(e)=>onChange('totalPrice', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label>部门
                <input value={form.department ?? ''} onChange={(e)=>onChange('department', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 其他信息 */}
        <Card>
          <CardHeader className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600">其他信息</CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <label>出厂
                <input value={form.factoryNumber ?? ''} onChange={(e)=>onChange('factoryNumber', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label>发票
                <input value={form.invoiceNumber ?? ''} onChange={(e)=>onChange('invoiceNumber', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label>经费编号
                <input value={form.fundingCode ?? ''} onChange={(e)=>onChange('fundingCode', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label>经费来源
                <input value={form.funding ?? ''} onChange={(e)=>onChange('funding', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label className="col-span-2">备注
                <textarea value={form.note ?? ''} onChange={(e)=>onChange('note', e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-24" />
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>取消</Button>
          <Button size="sm" onClick={save}>保存</Button>
        </div>
      </div>
    </div>
  );
}
