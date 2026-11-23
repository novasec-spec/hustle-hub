import { handleIntasendReturn } from "@/lib/payments/intasend-return";

// IntaSend rejects redirect URLs with query strings, so the payment id and token travel in the path.
export async function GET(req: Request, { params }: { params: Promise<{ pid: string; t: string }> }) {
  const { pid, t } = await params;
  return handleIntasendReturn(req, pid, t);
}
