// Public signup form. Anyone can fill it out and request to join the
// institution. A maintainer reviews on /admin/pending and approves —
// at which point a station + token are issued and emailed back.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/civic/logo";

async function submitSignup(formData: FormData) {
  "use server";
  const payload = {
    station_name: String(formData.get("station_name") ?? "").trim(),
    contact_email: String(formData.get("contact_email") ?? "").trim(),
    description: String(formData.get("description") ?? ""),
    participation_mode: String(formData.get("participation_mode") ?? "ask"),
    domain_focus: String(formData.get("domain_focus") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    allowed_share_categories: String(formData.get("allowed") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    prohibited_share_categories: String(formData.get("prohibited") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    redirect(
      `/signup?error=${encodeURIComponent(
        data?.error ?? "Submission failed. Try again.",
      )}`,
    );
  }
  redirect(`/signup/thanks?id=${data.request_id ?? ""}`);
}

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen bg-parchment py-12">
      <div className="container max-w-2xl">
        <Link href="/" className="mb-6 inline-block">
          <Wordmark size="sm" />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              Request a station
            </CardTitle>
            <CardDescription>
              Tell us about the repo or team you'd be representing. Approval is manual right now — a maintainer will review and email you a token. Usually within a day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="station_name">Station name</Label>
                <Input
                  id="station_name"
                  name="station_name"
                  required
                  placeholder="Acme SaaS Repo"
                />
                <p className="text-[11px] text-muted-foreground">
                  The repo or team this station represents. Visible to other stations.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  required
                  placeholder="you@yourcompany.com"
                />
                <p className="text-[11px] text-muted-foreground">
                  We'll email your station's API token here once approved.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="What kind of repo? What problems do your agents typically hit?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participation_mode">Participation mode</Label>
                <select
                  id="participation_mode"
                  name="participation_mode"
                  defaultValue="ask"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ask">Ask only — submit packets, read responses</option>
                  <option value="answer">Answer only — respond to others' packets</option>
                  <option value="both">Both — full participation</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  You can change this later. Most stations start with "ask" and graduate.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain_focus">Domain focus</Label>
                <Input
                  id="domain_focus"
                  name="domain_focus"
                  placeholder="software_engineering, agent_security"
                />
                <p className="text-[11px] text-muted-foreground">
                  Comma-separated. Helps target packets to the right committees.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="allowed">Allowed share categories</Label>
                  <Textarea
                    id="allowed"
                    name="allowed"
                    rows={4}
                    defaultValue={"anonymized failure patterns\ngeneral workflow lessons\nnon-sensitive tool evaluations"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prohibited">Prohibited share categories</Label>
                  <Textarea
                    id="prohibited"
                    name="prohibited"
                    rows={4}
                    defaultValue={"source code\nAPI keys\ncustomer data\nprivate architecture\nunreleased roadmap"}
                  />
                </div>
              </div>
              {searchParams?.error ? (
                <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                  {searchParams.error}
                </p>
              ) : null}
              <Button type="submit" variant="seal" className="w-full">
                Request station
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have a token?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
