import type { AdminSupportRequest } from "./supportAdmin";
import type { SupportRequestStatus } from "./supportRequests";

export type QueueStatus = SupportRequestStatus | "all";
export function searchSupportQueue(requests: AdminSupportRequest[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return requests;
  return requests.filter((request) => [request.referenceLabel, request.subject, request.email, request.message, request.categoryLabel, request.category]
    .some((value) => value.toLocaleLowerCase().includes(needle)));
}
export function supportQueueCounts(requests: AdminSupportRequest[]) {
  return requests.reduce((counts, request) => { counts.all++; counts[request.status]++; return counts; }, { all: 0, open: 0, reviewing: 0, closed: 0 });
}
export function visibleSupportSelection(selected: string[], requests: AdminSupportRequest[]) {
  const visible = new Set(requests.map((request) => request.id));
  return selected.filter((id) => visible.has(id));
}
export const SUPPORT_REPLY_SNIPPETS = [
  { id: "billing", label: "Billing and plans", categories: ["billing"], text: "Thanks for reaching out about billing. You can review your plan and billing controls in Settings → Billing. Please share the issue you see there and any relevant invoice reference, without payment card details, so we can investigate." },
  { id: "workflow", label: "Studio workflow", categories: ["workflow", "exports", "saved-projects"], text: "Thanks for reporting this workflow issue. Please share the last step you completed, the error text, and the project or request reference. Keep your original resume available while we investigate, and avoid sharing passwords or private credentials." },
  { id: "account", label: "Account and access", categories: ["account", "privacy", "other"], text: "Thanks for contacting us about your account. Please confirm which sign-in method you used and what happened when you tried to access RoleForge. Do not send passwords, sign-in links, or verification codes. We will use the account context attached to this request to investigate." },
] as const;
