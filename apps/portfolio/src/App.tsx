import { Separator } from "@repo/ui";
import { profile } from "./content/profile";
import { ContactSection } from "./components/ContactSection";
import { EducationSection } from "./components/EducationSection";
import { ExperienceSection } from "./components/ExperienceSection";
import { HeroSection } from "./components/HeroSection";
import { ProjectsSection } from "./components/ProjectsSection";
import { SkillsSection } from "./components/SkillsSection";
import { WritingSection } from "./components/WritingSection";

export function App() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <HeroSection
        name={profile.name}
        headline={profile.headline}
        location={profile.location}
        about={profile.about}
      />
      <Separator />
      <main className="flex flex-col gap-12">
        <ExperienceSection experience={profile.experience} />
        <EducationSection education={profile.education} />
        <SkillsSection skills={profile.skills} />
        <ProjectsSection projects={profile.projects} />
        <WritingSection writing={profile.writing} />
        <ContactSection links={profile.links} />
      </main>
      <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {profile.name}. Built with verified
          public profile data.
        </p>
      </footer>
    </div>
  );
}
