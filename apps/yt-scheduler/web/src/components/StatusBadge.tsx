import { Badge } from "@repo/ui/shadcn";
import type { JobStatus } from "../api";

const V: Record<JobStatus, "secondary" | "warning" | "info" | "success" | "destructive" | "outline"> = {
  queued: "secondary", uploading: "warning", processing: "warning", scheduled: "info", published: "success", failed: "destructive", cancelled: "outline",
};
export const StatusBadge = ({ status }: { status: JobStatus }) => <Badge variant={V[status]}>{status}</Badge>;
export const STATUSES: JobStatus[] = ["queued", "uploading", "processing", "scheduled", "published", "failed", "cancelled"];
export const canMove = (s: JobStatus) => ["queued", "failed", "scheduled", "processing"].includes(s);
