import type { FC } from "react";
import type { WritingAppProps } from "./types";
import { verifiedArticles, verifiedMediumUrl } from "./__fixtures__/writing";
import { formatArticleDate } from "./format";
import "./writing.css";

export const WritingApp: FC<WritingAppProps> = ({
  articles = verifiedArticles,
  mediumUrl = verifiedMediumUrl,
  className = "",
}) => {
  return (
    <div
      className={`yk-writing ${className}`.trim()}
      data-testid="writing-app"
    >
      {/* Retro Explorer Menu Bar */}
      <nav className="yk-writing__menubar" aria-label="Writing Window Menu">
        <span className="yk-writing__menu-item">
          <u>F</u>ile
        </span>
        <span className="yk-writing__menu-item">
          <u>V</u>iew
        </span>
        <span className="yk-writing__menu-item">
          <u>H</u>elp
        </span>
      </nav>

      {/* Main Content Area */}
      <div className="yk-writing__content">
        <header className="yk-writing__header">
          <p className="yk-writing__path" aria-hidden="true">
            C:\PORTFOLIO\WRITING\
          </p>
          <div className="yk-writing__title-row">
            <h2 className="yk-writing__heading">Writing/</h2>
            <div className="yk-writing__meta-group">
              <span className="yk-writing__count" data-testid="writing-count">
                {articles.length} {articles.length === 1 ? "article" : "articles"}
              </span>
              {mediumUrl ? (
                <a
                  href={mediumUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="yk-writing__medium-link"
                  data-testid="medium-profile-link"
                  aria-label="View Medium profile (opens in new tab)"
                >
                  <span aria-hidden="true">✍️</span>
                  <span>Medium Profile</span>
                  <span className="yk-writing__arrow" aria-hidden="true">
                    {" "}
                    ↗
                  </span>
                </a>
              ) : null}
            </div>
          </div>
        </header>

        {articles.length === 0 ? (
          <div className="yk-writing__empty" data-testid="writing-empty">
            No articles found in directory.
          </div>
        ) : (
          <ol className="yk-writing__list" aria-label="Published articles">
            {articles.map((article, index) => {
              const headingId = `writing-article-${index}`;

              return (
                <li key={article.href || article.title} className="yk-writing__item">
                  <article
                    className="yk-writing__article"
                    aria-labelledby={headingId}
                  >
                    <h3 id={headingId} className="yk-writing__article-title">
                      <a
                        href={article.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="yk-writing__article-link"
                      >
                        {article.title}
                        <span className="yk-writing__arrow" aria-hidden="true">
                          {" "}
                          ↗
                        </span>
                      </a>
                    </h3>
                    <div className="yk-writing__article-meta">
                      <span className="yk-writing__publication">
                        {article.publication}
                      </span>
                      <span className="yk-writing__separator" aria-hidden="true">
                        {" \u00B7 "}
                      </span>
                      <time
                        dateTime={article.date}
                        className="yk-writing__date"
                      >
                        {formatArticleDate(article.date)}
                      </time>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Retro Status Bar */}
      <footer className="yk-writing__statusbar" aria-label="Window status">
        <span>
          {articles.length} {articles.length === 1 ? "item" : "items"}
        </span>
        <span>Medium: @yogeshkumarasamy</span>
      </footer>
    </div>
  );
};

export default WritingApp;
