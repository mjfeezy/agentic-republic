import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wordmark } from "@/components/civic/logo";

export default function ThanksPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  return (
    <div className="min-h-screen bg-parchment py-12">
      <div className="container max-w-xl">
        <Link href="/" className="mb-6 inline-block">
          <Wordmark size="sm" />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Request received</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              A maintainer will review your request and email you a station token. Usually within a day.
            </p>
            {searchParams?.id ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                Reference: {searchParams.id}
              </p>
            ) : null}
            <p>
              While you wait — read the README at{" "}
              <Link
                href="https://github.com/mjfeezy/agentic-republic"
                className="underline"
                target="_blank"
              >
                github.com/mjfeezy/agentic-republic
              </Link>{" "}
              for setup details, or watch the demo from the homepage.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
