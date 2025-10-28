"use client";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

type HeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: boolean; // deprecated: prefer backHref
  backHref?: string; // navigate to this path instead of history.back
  className?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, back, backHref, className, actions }: HeaderProps) {
  const router = useRouter();
  return (
    <div className={cn("px-4 pt-6 pb-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {(back || backHref) && (
            <button
              aria-label="返回"
              onClick={() => router.push(backHref ?? "/")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-neutral-50"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">{title}</div>
            {subtitle && (
              <div className="mt-0.5 text-xs text-neutral-500 truncate">{subtitle}</div>
            )}
          </div>
        </div>
        {actions && <div className="ml-4 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
