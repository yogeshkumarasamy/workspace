import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { WritingEntry } from "../content/types";

interface WritingSectionProps {
  writing: WritingEntry[];
}

function formatWritingDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function WritingSection({ writing }: WritingSectionProps) {
  if (writing.length === 0) return null;

  return (
    <section aria-labelledby="writing-heading" className="space-y-4">
      <h2 id="writing-heading" className="text-2xl font-semibold tracking-tight">
        Writing
      </h2>
      <ul className="space-y-4">
        {writing.map((entry) => (
          <li key={entry.url}>
            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="text-lg">{entry.title}</CardTitle>
                <CardDescription>
                  {entry.venue} · {formatWritingDate(entry.date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read on Medium
                  </a>
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
