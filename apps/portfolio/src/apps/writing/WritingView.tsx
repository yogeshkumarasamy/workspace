import { formatIsoDate, httpsHref, isoDateTime } from "./format";
import type { Article, Profile } from "./types";
import "./writing.css";

const NEW_TAB = " (opens in a new tab)";

export function WritingView({
  windowId,
  profile,
}: {
  windowId: string;
  profile: Profile;
}) {
  const headingId = `${windowId}-heading`;
  const medium = httpsHref(profile.links.medium);

  return (
    <section className="yk-writing" aria-labelledby={headingId}>
      <h2 id={headingId}>Writing</h2>
      {profile.writing.length === 0 ? (
        <p className="yk-writing__empty">No articles listed.</p>
      ) : (
        <ul>
          {profile.writing.map((article) => (
            <li key={`${article.href}-${article.title}`}>
              <ArticleItem article={article} />
            </li>
          ))}
        </ul>
      )}
      {medium ? (
        <p className="yk-writing__medium">
          <a href={medium} rel="noreferrer" target="_blank">
            Medium profile
            <span className="yk-writing__sr">{NEW_TAB}</span>
          </a>
        </p>
      ) : null}
    </section>
  );
}

function ArticleItem({ article }: { article: Article }) {
  const href = httpsHref(article.href);
  const dateTime = isoDateTime(article.date);
  const label = formatIsoDate(article.date);

  return (
    <article>
      <h3>
        {href ? (
          <a href={href} rel="noreferrer" target="_blank">
            {article.title}
            <span className="yk-writing__sr">{NEW_TAB}</span>
          </a>
        ) : (
          article.title
        )}
      </h3>
      <p className="yk-writing__meta">
        {article.publication ? <span>{article.publication}</span> : null}
        {article.publication && article.date ? " " : null}
        {article.date ? (
          dateTime ? (
            <time dateTime={dateTime}>{label}</time>
          ) : (
            <span>{label}</span>
          )
        ) : null}
      </p>
    </article>
  );
}
