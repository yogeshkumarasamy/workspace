import type { ReactNode } from "react";
import type { Article, Education, Profile, Project, Role } from "./types";
import { formatIsoDate, formatYearMonth, httpsHref } from "./format";
import "./classic.css";
import "./print.css";

const SECTIONS = [
  ["about", "About"],
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["writing", "Writing"],
  ["skills", "Skills"],
  ["education", "Education"],
  ["contact", "Contact"],
] as const;

function showOwnerPlaceholder(): boolean {
  return import.meta.env.DEV;
}

function Placeholder({ children }: { children: string }) {
  if (!showOwnerPlaceholder()) return null;
  return <p className="yk-classic__placeholder">Placeholder: {children}</p>;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children?: ReactNode;
}) {
  const headingId = `classic-${id}`;
  return (
    <section aria-labelledby={headingId} id={id}>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: string }) {
  const safe = httpsHref(href);
  if (!safe) return <span>{children}</span>;
  return <a href={safe}>{children}</a>;
}

function RoleItem({ role }: { role: Role }) {
  return (
    <article>
      <h3>
        <ExternalLink href={role.companyUrl ?? ""}>{role.company}</ExternalLink>
      </h3>
      <p>{role.title}</p>
      <p className="yk-classic__meta">
        <time dateTime={role.start}>{formatYearMonth(role.start)}</time>
        {" \u2013 "}
        {role.end === null ? (
          "Present"
        ) : (
          <time dateTime={role.end}>{formatYearMonth(role.end)}</time>
        )}
        {role.location ? ` \u00b7 ${role.location}` : null}
      </p>
      {role.bullets.length > 0 ? (
        <ul>
          {role.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <Placeholder>role achievements not supplied yet.</Placeholder>
      )}
    </article>
  );
}

function ProjectItem({ project }: { project: Project }) {
  return (
    <article>
      <h3>
        <ExternalLink href={project.href}>{project.name}</ExternalLink>
      </h3>
      <p>{project.description}</p>
      {project.language ? <p>{project.language}</p> : null}
    </article>
  );
}

function ArticleItem({ article }: { article: Article }) {
  return (
    <article>
      <h3>
        <ExternalLink href={article.href}>{article.title}</ExternalLink>
      </h3>
      <p>{article.publication}</p>
      <p>
        <time dateTime={article.date}>{formatIsoDate(article.date)}</time>
      </p>
    </article>
  );
}

function EducationItem({ item }: { item: Education }) {
  return (
    <article>
      <h3>{item.institution}</h3>
      {item.credential ? <p>{item.credential}</p> : null}
      <p>
        {item.start}
        {"\u2013"}
        {item.end}
      </p>
    </article>
  );
}

function photoSrc(photo: string | null): string | null {
  if (!photo) return null;
  if (httpsHref(photo)) return photo;
  if (photo.startsWith("/")) return photo;
  return null;
}

export function ClassicView({ profile }: { profile: Profile }) {
  const mail = profile.email.includes("@") ? `mailto:${profile.email}` : null;
  const photo = photoSrc(profile.photo);
  const contents =
    profile.certifications.length > 0
      ? ([...SECTIONS, ["certifications", "Certifications"]] as const)
      : SECTIONS;

  return (
    <div className="yk-classic">
      <a className="yk-classic__skip" href="#classic-content">
        Skip to content
      </a>
      <header>
        <nav className="yk-classic__desktop" aria-label="Desktop">
          <a href="#/">Back to desktop</a>
        </nav>
        {photo ? (
          <img className="yk-classic__photo" src={photo} alt="" />
        ) : (
          <Placeholder>profile photo not supplied yet.</Placeholder>
        )}
        <h1>{profile.name}</h1>
        {profile.aliases.length > 0 ? (
          <p className="yk-classic__aka">Also known as {profile.aliases.join(", ")}</p>
        ) : null}
        {profile.headline ? <p className="yk-classic__lede">{profile.headline}</p> : null}
        {profile.location ? <p>{profile.location}</p> : null}
      </header>
      <main id="classic-content">
        <nav className="yk-classic__toc" aria-label="On this page">
          <ul>
            {contents.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <Section id="about" title="About">
          {profile.about ? (
            <p>{profile.about}</p>
          ) : (
            <Placeholder>bio not supplied yet.</Placeholder>
          )}
        </Section>
        <Section id="experience" title="Experience">
          {profile.experience.length > 0 ? (
            <ol>
              {profile.experience.map((role) => (
                <li key={`${role.company}-${role.title}-${role.start}`}>
                  <RoleItem role={role} />
                </li>
              ))}
            </ol>
          ) : null}
        </Section>
        <Section id="projects" title="Projects">
          {profile.projects.map((project) => (
            <ProjectItem key={project.href} project={project} />
          ))}
        </Section>
        <Section id="writing" title="Writing">
          {profile.writing.map((article) => (
            <ArticleItem key={article.href} article={article} />
          ))}
        </Section>
        <Section id="skills" title="Skills">
          {profile.skills.length > 0 ? (
            <ul>
              {profile.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          ) : null}
        </Section>
        <Section id="education" title="Education">
          {profile.education.map((item) => (
            <EducationItem key={`${item.institution}-${item.start}`} item={item} />
          ))}
        </Section>
        <Section id="contact" title="Contact">
          <address>
            {mail ? <a href={mail}>{profile.email}</a> : null}
            {profile.phone ? (
              <p>
                <a href={`tel:${profile.phone}`}>{profile.phone}</a>
              </p>
            ) : (
              <Placeholder>phone not supplied yet.</Placeholder>
            )}
            <ul className="yk-classic__links">
              <li>
                <ExternalLink href={profile.links.linkedin}>LinkedIn</ExternalLink>
              </li>
              <li>
                <ExternalLink href={profile.links.github}>GitHub</ExternalLink>
              </li>
              <li>
                <ExternalLink href={profile.links.medium}>Medium</ExternalLink>
              </li>
            </ul>
          </address>
        </Section>
        {profile.certifications.length > 0 ? (
          <Section id="certifications" title="Certifications">
            <ul>
              {profile.certifications.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        ) : (
          <Placeholder>certifications not supplied yet.</Placeholder>
        )}
      </main>
    </div>
  );
}
