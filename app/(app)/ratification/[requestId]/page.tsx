import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/civic/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RatificationStatusBadge, RiskBadge } from "@/components/civic/badges";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  approveRatification,
  rejectRatification,
  markImplemented,
  APPROVAL_RULES,
} from "@/lib/services/ratification";
import { snakeToTitle } from "@/lib/utils";

interface Props {
  params: { requestId: string };
}

async function approveAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await approveRatification(supabase, {
    request_id: String(formData.get("id")),
    reviewer_id: user?.id ?? null,
    notes: String(formData.get("notes") || ""),
    actor_user_id: user?.id ?? null,
  });
  revalidatePath(`/ratification/${formData.get("id")}`);
}

async function rejectAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await rejectRatification(supabase, {
    request_id: String(formData.get("id")),
    reviewer_id: user?.id ?? null,
    notes: String(formData.get("notes") || ""),
    actor_user_id: user?.id ?? null,
  });
  revalidatePath(`/ratification/${formData.get("id")}`);
}

async function implementedAction(formData: FormData) {
  "use server";
  const supabase = createSupabaseServerClient();
  await markImplemented(supabase, {
    request_id: String(formData.get("id")),
    notes: String(formData.get("notes") || ""),
  });
  revalidatePath(`/ratification/${formData.get("id")}`);
}

export default async function RatificationDetailPage({ params }: Props) {
  const supabase = createSupabaseServerClient();
  const { data: req } = await supabase
    .from("ratification_requests")
    .select(
      "*, station:stations(*), packet:civic_packets(id, title), response:packet_responses(*, representative:representatives(name))",
    )
    .eq("id", params.requestId)
    .maybeSingle();
  if (!req) notFound();
  const rules =
    APPROVAL_RULES[
      req.proposed_change_type as keyof typeof APPROVAL_RULES
    ];
  const decided = req.status !== "pending";

  return (
    <div>
      <PageHeader
        eyebrow={`Ratification · ${req.station?.name}`}
        title={req.title}
        description={req.recommendation_summary}
        actions={
          <div className="flex items-center gap-2">
            <RiskBadge level={req.risk_level as any} />
            <RatificationStatusBadge status={req.status as any} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-base">
                Proposed change
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="seal" className="text-[10px] uppercase">
                  {snakeToTitle(req.proposed_change_type)}
                </Badge>
                <Badge variant="muted" className="text-[10px]">
                  Approval: {req.approval_required}
                </Badge>
                {rules?.tests_required ? (
                  <Badge variant="warn" className="text-[10px]">
                    Tests required
                  </Badge>
                ) : null}
                {rules?.rollback_plan ? (
                  <Badge variant="warn" className="text-[10px]">
                    Rollback plan required
                  </Badge>
                ) : null}
                {rules?.second_review ? (
                  <Badge variant="danger" className="text-[10px]">
                    Second review required
                  </Badge>
                ) : null}
              </div>
              <p>{req.recommendation_summary}</p>
            </CardContent>
          </Card>

          {req.response ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  Source response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  From {req.response.representative?.name ?? "(unknown)"} ·{" "}
                  {snakeToTitle(req.response.response_type)}
                </p>
                {req.response.proposed_pattern ? (
                  <p className="rounded border bg-accent/30 px-3 py-2">
                    {req.response.proposed_pattern}
                  </p>
                ) : null}
                {(req.response.implementation_steps ?? []).length > 0 ? (
                  <ol className="list-decimal pl-5">
                    {req.response.implementation_steps.map(
                      (s: string, i: number) => <li key={i}>{s}</li>,
                    )}
                  </ol>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {decided ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">Decision</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <Badge
                  variant={
                    req.status === "approved" || req.status === "implemented"
                      ? "ok"
                      : "danger"
                  }
                >
                  {req.status}
                </Badge>
                {req.decision_notes ? (
                  <p className="mt-2 rounded border bg-muted/40 px-3 py-2 text-xs italic">
                    {req.decision_notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {req.status === "pending" ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">Decide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={approveAction} className="space-y-2">
                  <input type="hidden" name="id" value={req.id} />
                  <Label className="text-xs">Approval notes</Label>
                  <Textarea name="notes" rows={2} />
                  <Button type="submit" variant="seal" className="w-full">
                    Approve & adopt
                  </Button>
                </form>
                <form action={rejectAction} className="space-y-2">
                  <input type="hidden" name="id" value={req.id} />
                  <Label className="text-xs">Rejection notes</Label>
                  <Textarea name="notes" rows={2} />
                  <Button type="submit" variant="destructive" className="w-full">
                    Reject
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : req.status === "approved" ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-base">
                  Mark implemented
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={implementedAction} className="space-y-2">
                  <input type="hidden" name="id" value={req.id} />
                  <Textarea name="notes" rows={2} placeholder="PR link, etc." />
                  <Button type="submit" variant="outline" className="w-full">
                    Mark implemented
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
