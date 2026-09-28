import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { EducationEntry } from "../content/types";

interface EducationSectionProps {
  education: EducationEntry[];
}

export function EducationSection({ education }: EducationSectionProps) {
  if (education.length === 0) return null;

  return (
    <section aria-labelledby="education-heading" className="space-y-4">
      <h2 id="education-heading" className="text-2xl font-semibold tracking-tight">
        Education
      </h2>
      <ul className="space-y-4">
        {education.map((entry) => (
          <li key={`${entry.school}-${entry.years}`}>
            <Card>
              <CardHeader className="gap-1">
                <CardTitle className="text-lg">{entry.school}</CardTitle>
                {entry.degree ? (
                  <CardDescription className="text-base text-foreground/80">
                    {entry.degree}
                  </CardDescription>
                ) : null}
                <p className="text-sm text-muted-foreground">{entry.years}</p>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
