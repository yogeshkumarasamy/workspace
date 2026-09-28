import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import type { ProjectEntry } from "../content/types";

interface ProjectsSectionProps {
  projects: ProjectEntry[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  if (projects.length === 0) return null;

  return (
    <section aria-labelledby="projects-heading" className="space-y-4">
      <h2 id="projects-heading" className="text-2xl font-semibold tracking-tight">
        Projects
      </h2>
      <ul className="grid gap-4 sm:grid-cols-1">
        {projects.map((project) => (
          <li key={project.url}>
            <Card>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.language ? (
                    <Badge variant="outline">{project.language}</Badge>
                  ) : null}
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub
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
