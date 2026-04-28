import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KnowledgeTypeBadge,
  PacketStatusBadge,
  RatificationStatusBadge,
  RiskBadge,
  TrustScoreBadge,
  VisaBadge,
} from "./badges";
import { Badge } from "@/components/ui/badge";
import { formatDate, snakeToTitle } from "@/lib/utils";
import type {
  CivicPacket,
  Committee,
  Institution,
  PacketResponse,
  QuarantineCase,
  RatificationRequest,
  Representative,
  Station,
  StationKnowledgeItem,
} from "@/lib/types";

export function StationCard({ station }: { station: Station }) {
  return (
    <Link href={`/stations/${station.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-base">{station.name}</CardTitle>
            <Badge variant="muted" className="font-mono text-[10px]">
              {station.station_type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {station.description || "No description provided."}
          </p>
          <div className="flex flex-wrap gap-1">
            {station.allowed_share_categories.slice(0, 3).map((cat) => (
              <Badge key={cat} variant="ok" className="text-[10px]">
                {cat}
              </Badge>
            ))}
            {station.prohibited_share_categories.slice(0, 2).map((cat) => (
              <Badge key={cat} variant="danger" className="text-[10px]">
                ✕ {cat}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function RepresentativeCard({
  representative,
  station,
  trust,
}: {
  representative: Representative;
  station?: Pick<Station, "name"> | null;
  trust?: number;
}) {
  return (
    <Link href={`/representatives/${representative.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="font-serif text-base">
              {representative.name}
            </CardTitle>
            <VisaBadge visa={representative.visa_class} />
          </div>
          {station ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              station: {station.name}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          <div className="flex flex-wrap gap-1">
            {representative.domain_focus.map((d) => (
              <Badge key={d} variant="secondary" className="text-[10px]">
                {snakeToTitle(d)}
              </Badge>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Trust</span>
            <TrustScoreBadge
              score={trust ?? representative.trust_score_default}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function PacketCard({
  packet,
  committee,
  station,
}: {
  packet: CivicPacket;
  committee?: Committee | null;
  station?: Station | null;
}) {
  return (
    <Link href={`/packets/${packet.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant="seal" className="mb-2 text-[10px] uppercase">
                {snakeToTitle(packet.packet_type)}
              </Badge>
              <CardTitle className="font-serif text-base leading-snug">
                {packet.title}
              </CardTitle>
            </div>
            <PacketStatusBadge status={packet.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {packet.summary}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {committee ? (
              <span className="font-mono">{committee.name}</span>
            ) : null}
            {station ? (
              <span className="font-mono opacity-70">↑ {station.name}</span>
            ) : null}
            <span className="ml-auto font-mono opacity-70">
              {formatDate(packet.created_at)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CommitteeCard({
  committee,
  packetCount = 0,
}: {
  committee: Committee;
  packetCount?: number;
}) {
  return (
    <Link href={`/institutions/${committee.institution_id}/committees/${committee.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="font-serif text-base">{committee.name}</CardTitle>
          <Badge variant="muted" className="w-fit text-[10px]">
            {committee.domain}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {committee.description}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {packetCount} active packet{packetCount === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function InstitutionCard({
  institution,
  committeeCount = 0,
}: {
  institution: Institution;
  committeeCount?: number;
}) {
  return (
    <Link href={`/institutions/${institution.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <Badge variant="seal" className="mb-2 w-fit text-[10px] uppercase">
            Institution
          </Badge>
          <CardTitle className="font-serif text-lg">{institution.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm text-muted-foreground">{institution.description}</p>
          <p className="text-[11px] text-muted-foreground">
            {committeeCount} committee{committeeCount === 1 ? "" : "s"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function QuarantineCaseCard({
  case_,
  packet,
}: {
  case_: QuarantineCase;
  packet?: Pick<CivicPacket, "title" | "id"> | null;
}) {
  return (
    <Link href={`/quarantine/${case_.id}`}>
      <Card className="h-full border-civic-danger/30 transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="font-serif text-base">
              {packet?.title ?? "Quarantined packet"}
            </CardTitle>
            <Badge variant="danger" className="text-[10px] uppercase">
              {case_.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {case_.reason}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            opened {formatDate(case_.created_at)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function RatificationRequestCard({
  request,
  station,
}: {
  request: RatificationRequest;
  station?: Pick<Station, "name"> | null;
}) {
  return (
    <Link href={`/ratification/${request.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="font-serif text-base leading-snug">
              {request.title}
            </CardTitle>
            <RatificationStatusBadge status={request.status} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {station ? <span className="font-mono">{station.name}</span> : null}
            <span className="font-mono opacity-70">
              {snakeToTitle(request.proposed_change_type)}
            </span>
            <RiskBadge level={request.risk_level} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {request.recommendation_summary}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function KnowledgeItemCard({
  item,
}: {
  item: StationKnowledgeItem;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-serif text-base leading-snug">
            {item.title}
          </CardTitle>
          <KnowledgeTypeBadge type={item.knowledge_type} />
        </div>
        {item.adopted_at ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            adopted {formatDate(item.adopted_at)}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-sm text-muted-foreground">{item.summary}</p>
        {item.notes ? (
          <p className="rounded border bg-muted/40 px-2 py-1 text-xs italic text-muted-foreground">
            {item.notes}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ResponseCard({
  response,
  representativeName,
}: {
  response: PacketResponse;
  representativeName?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="seal" className="text-[10px] uppercase">
              {snakeToTitle(response.response_type)}
            </Badge>
            <CardTitle className="mt-2 font-serif text-base leading-snug">
              {response.summary}
            </CardTitle>
          </div>
          <Badge variant="muted" className="font-mono">
            {(response.confidence_score * 100).toFixed(0)}% conf
          </Badge>
        </div>
        {representativeName ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            from {representativeName}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-sm">
        {response.proposed_pattern ? (
          <p className="rounded border bg-accent/30 px-3 py-2 text-sm">
            {response.proposed_pattern}
          </p>
        ) : null}
        {response.implementation_steps.length > 0 ? (
          <div>
            <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Implementation steps
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {response.implementation_steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {response.risks.length > 0 ? (
          <div>
            <div className="mb-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Risks
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {response.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
