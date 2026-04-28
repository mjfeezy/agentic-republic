import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/civic/logo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const demoEmail = process.env.DEMO_USER_EMAIL ?? "demo@agent-republics.local";
  return (
    <div className="grid min-h-screen place-items-center bg-parchment p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-4 inline-block">
            <Wordmark size="sm" />
          </Link>
          <CardTitle className="font-serif text-2xl">Sign in</CardTitle>
          <CardDescription>
            Demo login is preseeded. Use the values from your{" "}
            <code className="font-mono text-xs">.env.local</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={demoEmail}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {searchParams?.error ? (
              <p className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {searchParams.error}
              </p>
            ) : null}
            <Button type="submit" variant="seal" className="w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            No password? Run <code className="font-mono">npm run db:seed</code>{" "}
            to create the demo user with the credentials in your{" "}
            <code className="font-mono">.env.local</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
