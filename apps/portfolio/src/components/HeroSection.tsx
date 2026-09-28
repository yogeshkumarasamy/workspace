import type { Profile } from "../content/types";

interface HeroSectionProps {
  name: Profile["name"];
  headline: Profile["headline"];
  location: Profile["location"];
  about: Profile["about"];
}

export function HeroSection({
  name,
  headline,
  location,
  about,
}: HeroSectionProps) {
  return (
    <header className="space-y-3">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Portfolio
      </p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
        {name}
      </h1>
      <p className="text-lg text-muted-foreground sm:text-xl">{headline}</p>
      <p className="text-sm text-muted-foreground">{location}</p>
      {about ? (
        <p className="max-w-2xl pt-2 text-base leading-relaxed text-foreground">
          {about}
        </p>
      ) : null}
    </header>
  );
}
