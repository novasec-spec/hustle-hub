export type Client = {
  id: string; name: string; email: string | null; phone: string | null; company: string | null;
  status: "lead" | "active" | "past"; notes: string | null; created_at: string;
};
export type Invoice = {
  id: string; client_id: string | null; number: string; description: string | null;
  amount: number; currency: string; issue_date: string; due_date: string | null;
  status: "draft" | "sent" | "paid" | "overdue"; paid_at: string | null; created_at: string;
};
export type Project = {
  id: string; client_id: string | null; name: string; description: string | null; deadline: string | null; created_at: string;
};
export type Task = {
  id: string; project_id: string; title: string; status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high"; due_date: string | null; created_at: string;
};
export type Content = {
  id: string; title: string; platform: "youtube" | "tiktok" | "instagram";
  status: "idea" | "scripting" | "filming" | "editing" | "scheduled" | "posted";
  scheduled_for: string | null; caption: string | null; created_at: string;
};
export type Note = { id: string; title: string; body: string; pinned: boolean; created_at: string; updated_at: string };
export type FileRow = { id: string; name: string; path: string; size: number | null; mime: string | null; created_at: string };
export type Txn = {
  id: string; kind: "income" | "expense"; amount: number; category: string; description: string | null;
  date: string; invoice_id: string | null; created_at: string;
};
