import { handleIntasendReturn } from "@/lib/payments/intasend-return";

// Legacy query-string form: /api/pay/intasend/return?pid=...&t=...
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return handleIntasendReturn(req, q.get("pid") ?? "", q.get("t"));
}
