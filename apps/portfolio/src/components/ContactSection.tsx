import { Button, Separator } from "@repo/ui";
import type { Profile } from "../content/types";

interface ContactSectionProps {
  links: Profile["links"];
}

export function ContactSection({ links }: ContactSectionProps) {
  const external = [
    { label: "LinkedIn", href: links.linkedIn },
    { label: "Medium", href: links.medium },
    { label: "GitHub", href: links.github },
    { label: "FULL Creative", href: links.company },
  ];

  return (
    <section aria-labelledby="contact-heading" className="space-y-4">
      <h2 id="contact-heading" className="text-2xl font-semibold tracking-tight">
        Contact
      </h2>
      <Separator />
      <div className="flex flex-wrap gap-2">
        {links.email ? (
          <Button asChild variant="default" size="sm">
            <a href={`mailto:${links.email}`}>{links.email}</a>
          </Button>
        ) : null}
        {external.map((item) => (
          <Button key={item.href} asChild variant="outline" size="sm">
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              {item.label}
            </a>
          </Button>
        ))}
      </div>
    </section>
  );
}
