# 设备仪器盘点（H5）技术文档 v1.0

最后更新：2025-10-28

---

## 1. 概述

- 前端：Next.js（App Router）+ React 19 + TypeScript。
- 后端：使用 Next.js Route Handlers（`app/api/**/route.ts`）实现 API；与 MySQL 通讯（`mysql2` 或 Prisma 任一方案）。
- 数据库：MySQL（已有表 `devices`）。
- 功能覆盖：扫码、查询、查询结果、设备台账、设备信息、设备编辑、缺失快捷切换。

---

## 2. 环境与配置

- Node：建议 20 LTS。
- 环境变量：
  - `DATABASE_URL`（示例：`mysql://user:pass@host:3306/dbname?timezone=Z`）。
  - `NEXT_RUNTIME` 无需显式设置；默认使用 Node.js 运行时以便使用数据库驱动。
- 依赖建议：
  - 数据库访问（二选一）：
    - 直连：`mysql2`
    - ORM：`prisma`, `@prisma/client`
  - 校验与序列化：`zod`
  - 扫码库（前端）：`@zxing/browser` 或 `html5-qrcode`
  - 数据获取（前端 选配）：`@tanstack/react-query`

---

## 3. 数据库结构

已存在表定义（供参考）：

```sql
CREATE TABLE `devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `device_type` varchar(32) NOT NULL DEFAULT '资产',
  `model` varchar(255) DEFAULT NULL,
  `unit` varchar(32) DEFAULT '台',
  `unit_price` decimal(14,2) DEFAULT '0.00',
  `total_price` decimal(16,2) DEFAULT '0.00',
  `quantity` int DEFAULT '1',
  `department` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `keeper` varchar(255) DEFAULT NULL,
  `storage_at` date DEFAULT NULL,
  `usage` text,
  `factory_number` varchar(255) DEFAULT NULL,
  `invoice_number` varchar(255) DEFAULT NULL,
  `funding_code` varchar(255) DEFAULT NULL,
  `funding` varchar(255) DEFAULT NULL,
  `note` text,
  `status` varchar(64) DEFAULT '在用',
  `missing` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `devices_code_uq` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
```

索引建议（优化查询/排序/筛选）：

```sql
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_missing ON devices(missing);
CREATE INDEX idx_devices_updated_at ON devices(updated_at);
CREATE INDEX idx_devices_keeper ON devices(keeper);
CREATE INDEX idx_devices_department ON devices(department);
-- 如需模糊搜索：
-- MySQL 8 InnoDB 可用 FULLTEXT（中文效果视分词而定）
-- CREATE FULLTEXT INDEX ft_devices_text ON devices(name, model, location, keeper);
```

时间与小数：
- `created_at/updated_at` 为 DATETIME(3)，建议统一以 UTC 存储，前端本地化显示。
- DECIMAL 字段（`unit_price/total_price`）为避免精度损失，API 层以字符串返回，前端显示时格式化。

---

## 4. 字段映射与 DTO

数据库字段为下划线命名，API 与前端采用小驼峰命名。映射如下：

- id → id: number
- code → code: string
- name → name: string
- device_type → deviceType: string
- model → model: string | null
- unit → unit: string | null
- unit_price → unitPrice: string
- total_price → totalPrice: string
- quantity → quantity: number | null
- department → department: string | null
- location → location: string | null
- keeper → keeper: string | null
- storage_at → storageAt: string | null (yyyy-MM-dd)
- usage → usage: string | null
- factory_number → factoryNumber: string | null
- invoice_number → invoiceNumber: string | null
- funding_code → fundingCode: string | null
- funding → funding: string | null
- note → note: string | null
- status → status: string
- missing → missing: boolean
- created_at → createdAt: string (ISO)
- updated_at → updatedAt: string (ISO)

TypeScript DTO：

```ts
export interface DeviceDTO {
  id: number;
  code: string;
  name: string;
  deviceType: string;
  model: string | null;
  unit: string | null;
  unitPrice: string;      // DECIMAL as string
  totalPrice: string;     // DECIMAL as string
  quantity: number | null;
  department: string | null;
  location: string | null;
  keeper: string | null;
  storageAt: string | null; // yyyy-MM-dd
  usage: string | null;
  factoryNumber: string | null;
  invoiceNumber: string | null;
  fundingCode: string | null;
  funding: string | null;
  note: string | null;
  status: string;
  missing: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
```

映射与格式化：
- `missing`：`tinyint(1)` ↔︎ boolean（0/1 ↔︎ false/true）。
- 日期：`storage_at` 格式化为 `yyyy-MM-dd`；`created_at/updated_at` 以 ISO 字符串返回。
- `null`/"null"：后端清洗为 `null`，前端展示“—”。

---

## 5. API 设计

基础路径：`/api/devices`

### 5.1 列表/查询

- GET `/api/devices?search=关键词&code=设备码&status=在用&missing=true|false&sort=updatedAt:desc&offset=0&limit=20`
- 说明：
  - `code` 存在时优先精确匹配；若严格精确无结果，可降级到模糊或组合字段搜索（以满足扫码多结果场景）。
  - `search` 同时在 `name/model/location/keeper/department` 上进行 `LIKE`（或 FULLTEXT）。
  - `missing` 为布尔过滤；`status` 精确匹配。
  - `sort` 支持：`updatedAt|name|status|missing` + `asc|desc`。
- 响应：

```json
{
  "items": [DeviceDTO, ...],
  "total": 123
}
```

### 5.2 获取详情

- GET `/api/devices/:id`
- 响应：`DeviceDTO`

### 5.3 快捷修改“是否缺失”

- PATCH `/api/devices/:id`
- Body：`{ "missing": true }`（或其他允许字段）
- 响应：更新后的 `DeviceDTO`

### 5.4 错误响应格式

```json
{ "error": "NotFound", "message": "device not found" }
```

HTTP 状态码：400/401/403/404/409/429/500。

---

## 6. 后端实现（Next.js Route Handlers）

目录规范（示例）：

```
app/
  api/
    devices/
      route.ts          # GET 列表
    devices/[id]/
      route.ts          # GET 详情, PATCH 更新
lib/
  db.ts                 # 数据库连接（mysql2 或 Prisma）
  devices-repo.ts       # SQL 读写与映射封装
  mapping.ts            # 下划线↔小驼峰映射与格式化
```

### 6.1 直连 mysql2（轻量方案）

- 依赖：`mysql2`
- 连接：创建全局连接池（Node 进程内复用）。
- 映射：查询结果字段转换为 DTO（含日期、decimal、missing）。
- 事务：PATCH 写入使用单条 `UPDATE`；必要时开启事务。

示例查询（列表/搜索）：

```sql
SELECT * FROM devices
WHERE 1=1
  /* 精确 code 优先 */
  AND (:code IS NULL OR code = :code)
  /* 模糊搜索（当未提供 code 或允许多结果场景） */
  AND (
    :search IS NULL OR (
      name LIKE CONCAT('%', :search, '%')
      OR model LIKE CONCAT('%', :search, '%')
      OR location LIKE CONCAT('%', :search, '%')
      OR keeper LIKE CONCAT('%', :search, '%')
      OR department LIKE CONCAT('%', :search, '%')
    )
  )
  AND (:status IS NULL OR status = :status)
  AND (:missing IS NULL OR missing = :missing)
ORDER BY updated_at DESC
LIMIT :limit OFFSET :offset;
```

注意：如果希望“扫码可能多条”，流程建议为：
1) 先以扫描得到的码做 `code = ?` 精确匹配；
2) 若 0 条，再以 `LIKE` 或组合字段（如 `factory_number`）做扩展搜索；
3) 返回多条则走【查询结果】页。

### 6.2 Prisma（ORM 方案）

- Schema 建议（对应既有表，保留 snake_case 映射）：

```prisma
model devices {
  id             Int       @id @default(autoincrement())
  code           String    @unique
  name           String
  device_type    String    @default("资产")
  model          String?
  unit           String?   @default("台")
  unit_price     Decimal?  @default(0.00)
  total_price    Decimal?  @default(0.00)
  quantity       Int?
  department     String?
  location       String?
  keeper         String?
  storage_at     DateTime?
  usage          String?
  factory_number String?
  invoice_number String?
  funding_code   String?
  funding        String?
  note           String?
  status         String?   @default("在用")
  missing        Boolean   @default(false) @map("missing")
  created_at     DateTime  @default(now())
  updated_at     DateTime  @default(now())
  @@map("devices")
}
```

- Prisma Client 查询后需映射到 `DeviceDTO`（含 decimal→string、日期格式等）。

---

## 7. 前端实现要点

### 7.1 路由与页面
- Tab 导航：`/scan`、`/search`、`/ledger`（设备台账）。
- 详情页：`/devices/[id]`
- 编辑页：`/devices/[id]/edit`

### 7.2 数据获取与状态
- 建议使用 `fetch` + `use`（Next 16）或 `react-query` 管理缓存与乐观更新。
- 缺失切换：列表与详情采用乐观更新（先本地切换，失败回滚）。

### 7.3 扫码
- 优先 `@zxing/browser`：
  - 使用 `BrowserMultiFormatReader` + `getUserMedia`。
  - 无权限/不支持时，引导至“查询页”。
- 结果处理：
  - 扫描字符串解析出 `code`；
  - 调用 `/api/devices?code=...`；
  - 0 条 → 提示未找到；1 条 → 跳详情；多条 → 跳“查询结果”。

### 7.4 展示与格式化
- 金额：统一千分位，两位小数（前端格式化），原始值保持字符串。
- 日期：`storageAt` 显示 `yyyy-MM-dd`；`createdAt/updatedAt` 相对时间或日期时间。
- 空值：展示“—”。

---

## 8. 安全与权限

- 鉴权（可选）：
  - 盘点员：查询、查看、切换缺失。
  - 管理员：允许编辑字段。
- 校验：API 使用 `zod` 校验 query/body；限制 `limit` 最大值（如 100）。
- 防护：
  - 速率限制（可在边缘或中间件实现）。
  - 输入转义与参数化查询，防 SQL 注入。
  - CORS：同域 H5，不额外暴露跨域。

---

## 9. 性能与可观测性

- 分页：`limit/offset`，可扩展为 cursor。
- 索引：见第 3 节；常用排序（`updated_at`）需索引。
- 缓存：客户端缓存查询结果；可在服务端添加短期缓存（注意一致性）。
- 日志：记录路由、耗时、错误；必要时埋点扫码成功率/失败原因。

---

## 10. 测试与验收

- 单元测试：
  - 映射层（DB → DTO）字段与格式化正确性。
  - 查询构造（过滤、排序、分页）。
- 接口测试（E2E）：
  - GET 列表/查询、GET 详情、PATCH 缺失。
  - 扫码流程三分支（0/1/多条）。
- 验收要点：与《需求文档》中的验收标准一一对应。

---

## 11. 部署与运维

- 运行：`next build && next start`。
- 变量：`DATABASE_URL` 注入到运行环境。
- 数据库：保证网络连通与只读/读写账号；备份策略。
- 迁移：如采用 Prisma，使用 `prisma migrate`；纯 SQL 则准备灰度脚本。

---

## 12. 示例请求

- 查询：

```bash
curl \
  "http://localhost:3000/api/devices?search=%E5%87%8F%E5%8E%8B%E9%98%80&limit=20&offset=0&sort=updatedAt:desc"
```

- 精确 code（扫码）：

```bash
curl "http://localhost:3000/api/devices?code=1604761D"
```

- 更新缺失：

```bash
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"missing": true}' \
  "http://localhost:3000/api/devices/761"
```

---

## 13. 兼容“扫码多结果”的说明

尽管数据库对 `code` 存在唯一约束，实际扫码字符串可能不只包含纯 `code`，或需要在 `name/model/location/factory_number` 等字段做扩展匹配。因此：
- 首选精确 `code` 命中唯一设备；
- 否则进入“扩展搜索”（`LIKE`/FULLTEXT/组合字段）；
- 返回多条时在前端“查询结果”页供用户选择。

---

本技术文档与《docs/pra.md》配套：如需调整字段/流程，请以两份文档联动更新为准。

