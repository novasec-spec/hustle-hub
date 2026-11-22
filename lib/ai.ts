export type AiKind = "caption" | "proposal" | "email" | "free";

export async function askAI(kind: AiKind, input: Record<string, string>): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, input }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "AI request failed");
  return data.text as string;
}
