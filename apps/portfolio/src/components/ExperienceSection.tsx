import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { ExperienceEntry } from "../content/types";
import { formatDateRange } from "../lib/formatDate";

interface ExperienceSectionProps {
  experience: ExperienceEntry[];
}

export function ExperienceSection({ experience }: ExperienceSectionProps) {
  if (experience.length === 0) return null;

  return (
    <section aria-labelledby="experience-heading" className="space-y-4">
      <h2 id="experience-heading" className="text-2xl font-semibold tracking-tight">
        Experience
      </h2>
      <ul className="space-y-4">
        {experience.map((entry) => (
          <li
            key={`${entry.company}-${entry.title}-${entry.startDate}`}
          >
            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="text-lg">{entry.title}</CardTitle>
                <CardDescription className="text-base text-foreground/80">
                  {entry.companyUrl ? (
                    <a
                      href={entry.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {entry.company}
                    </a>
                  ) : (
                    entry.company
                  )}
                  {entry.companyGroupTotal
                    ? ` · ${entry.companyGroupTotal}`
                    : null}
                </CardDescription>
                <p className="text-sm text-muted-foreground">
                  {formatDateRange(entry.startDate, entry.endDate)}
                  {entry.location ? ` · ${entry.location}` : null}
                </p>
              </CardHeader>
              {(entry.note || entry.bullets.length > 0) && (
                <CardContent className="space-y-2">
                  {entry.note ? (
                    <p className="text-sm text-muted-foreground">{entry.note}</p>
                  ) : null}
                  {entry.bullets.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {entry.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
