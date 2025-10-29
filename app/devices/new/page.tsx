"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { DeviceDTO } from "@/lib/types";
import { devicesApi } from "@/lib/api";
import { PageHeader } from "@/components/ui/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type CreateForm = Partial<DeviceDTO> & { code: string; name: string };

export default function DeviceCreatePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-6 text-sm text-neutral-400">加载中…</div>}>
      <DeviceCreateForm />
    </Suspense>
  );
}

function DeviceCreateForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const presetCode = sp?.get("code") || "";
  const backHref = sp?.get("src") === "scan" ? "/scan" : "/ledger";

  const [form, setForm] = useState<CreateForm>({
    code: presetCode,
    name: "",
    deviceType: "资产",
    status: "在用",
    unit: "台",
    quantity: 1,
    unitPrice: "0.00",
    totalPrice: "0.00",
  });

  useEffect(() => {
    if (presetCode) setForm((f) => ({ ...f, code: presetCode }));
  }, [presetCode]);

  function onChange<K extends keyof CreateForm>(key: K, val: CreateForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key as string]: "" }));
  }

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(values: CreateForm) {
    const errs: Record<string, string> = {};
    if (!values.name || !values.name.trim()) errs.name = "请填写名称";
    if (!values.code || !values.code.trim()) errs.code = "请填写编码";
    return errs;
  }

  function save() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); toast.error("请完善必填项"); return; }
    const payload: Partial<DeviceDTO> = {
      code: form.code.trim(),
      name: form.name.trim(),
      deviceType: form.deviceType ?? "资产",
      model: form.model ?? null,
      unit: form.unit ?? "台",
      unitPrice: form.unitPrice ?? "0.00",
      totalPrice: form.totalPrice ?? "0.00",
      quantity: form.quantity ?? 1,
      department: form.department ?? null,
      location: form.location ?? null,
      keeper: form.keeper ?? null,
      storageAt: form.storageAt ?? null,
      usage: form.usage ?? null,
      factoryNumber: form.factoryNumber ?? null,
      invoiceNumber: form.invoiceNumber ?? null,
      fundingCode: form.fundingCode ?? null,
      funding: form.funding ?? null,
      note: form.note ?? null,
      status: form.status ?? "在用",
      missing: Boolean(form.missing) || false,
    };
    toast.promise(
      devicesApi.create(payload).then((created) => {
        router.replace(`/devices/${created.id}`);
      }),
      { loading: "保存中…", success: "新增成功", error: "新增失败" }
    );
  }

  return (
    <div className="mx-auto max-w-xl px-0">
      <PageHeader title="新增设备台账" backHref={backHref} />
      <div className="mx-4 space-y-4">
        <Card>
          <CardHeader className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600">基本信息</CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <label className="col-span-2">名称<span className="ml-0.5 text-red-600">*</span>
                <input
                  value={form.name}
                  onChange={(e)=>onChange('name', e.target.value)}
                  className={`mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 ${errors.name ? 'border-red-500 focus:ring-red-500' : 'focus:ring-black/20'}`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </label>
              <label>编码<span className="ml-0.5 text-red-600">*</span>
                <input
                  value={form.code}
                  onChange={(e)=>onChange('code', e.target.value)}
                  className={`mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 ${errors.code ? 'border-red-500 focus:ring-red-500' : 'focus:ring-black/20'}`}
                />
                {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
              </label>
              <label>型号
                <input value={form.model ?? ''} onChange={(e)=>onChange('model', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label>状态
                <select value={form.status ?? '在用'} onChange={(e)=>onChange('status', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm">
                  <option value="在用">在用</option>
                  <option value="停用">停用</option>
                  <option value="报废">报废</option>
                </select>
              </label>
              <label>单位
                <input value={form.unit ?? '台'} onChange={(e)=>onChange('unit', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label>数量
                <input value={form.quantity ?? 1} onChange={(e)=>onChange('quantity', Number(e.target.value)||0)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label className="col-span-2">位置
                <input value={form.location ?? ''} onChange={(e)=>onChange('location', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20" />
              </label>
              <label>保管人
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

        <Card>
          <CardHeader className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600">资产信息</CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <label>单价
                <input value={form.unitPrice ?? ''} onChange={(e)=>onChange('unitPrice', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label>总价
                <input value={form.totalPrice ?? ''} onChange={(e)=>onChange('totalPrice', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label>归属部门
                <input value={form.department ?? ''} onChange={(e)=>onChange('department', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 py-3 border-b bg-gradient-to-r from-neutral-50 to-white text-sm text-neutral-600">票据/经费</CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <label>出厂编号
                <input value={form.factoryNumber ?? ''} onChange={(e)=>onChange('factoryNumber', e.target.value)} className="mt-1 w-full h-10 rounded-md border px-3 text-sm" />
              </label>
              <label>发票号
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
          <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>取消</Button>
          <Button size="sm" onClick={save}>保存</Button>
        </div>
      </div>
    </div>
  );
}
