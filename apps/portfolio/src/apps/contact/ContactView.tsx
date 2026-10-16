import React, { useState } from "react";
import type { ContactViewProps, Profile } from "./types";
import { testProfile } from "./__fixtures__/profile";
import "./contact.css";

const NEW_TAB = " (opens in a new tab)";

export const ContactView: React.FC<ContactViewProps> = ({
  windowId,
  profile: inputProfile,
}) => {
  const profile: Profile = inputProfile ?? testProfile;
  const headingId = `${windowId}-heading`;
  const [copyStatus, setCopyStatus] = useState<string>("");

  const email = profile.email;
  const { linkedin, github, medium } = profile.links || {};

  const handleCopyEmail = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = email;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus("Email copied to clipboard!");
    } catch {
      setCopyStatus("Failed to copy email.");
    }
  };

  return (
    <section className="yk-contact" aria-labelledby={headingId}>
      <header className="yk-contact__header">
        <h2 id={headingId} className="yk-contact__title">
          Contact Information
        </h2>
        <p className="yk-contact__subtitle">
          Get in touch with {profile.name}
        </p>
      </header>

      <div className="yk-contact__section">
        <label htmlFor={`${windowId}-email`} className="yk-contact__label">
          Direct Email:
        </label>
        <div className="yk-contact__email-row">
          <a
            id={`${windowId}-email`}
            href={`mailto:${email}`}
            className="yk-contact__email-link"
            data-testid="contact-email-link"
          >
            {email}
          </a>
          <button
            type="button"
            className="yk-contact__btn"
            onClick={handleCopyEmail}
            data-testid="copy-email-btn"
            aria-label="Copy email address"
          >
            Copy Email
          </button>
        </div>
        <div
          className="yk-contact__status"
          aria-live="polite"
          data-testid="copy-status"
        >
          {copyStatus}
        </div>
      </div>

      <div className="yk-contact__section">
        <h3 className="yk-contact__subtitle">Profiles & Links</h3>
        <ul className="yk-contact__links">
          {linkedin && (
            <li className="yk-contact__link-item">
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="contact-linkedin"
              >
                <span aria-hidden="true">💼</span>
                <span>LinkedIn Profile</span>
                <span className="yk-contact__sr">{NEW_TAB}</span>
              </a>
            </li>
          )}
          {github && (
            <li className="yk-contact__link-item">
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="contact-github"
              >
                <span aria-hidden="true">🐙</span>
                <span>GitHub Profile</span>
                <span className="yk-contact__sr">{NEW_TAB}</span>
              </a>
            </li>
          )}
          {medium && (
            <li className="yk-contact__link-item">
              <a
                href={medium}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="contact-medium"
              >
                <span aria-hidden="true">✍️</span>
                <span>Medium Articles</span>
                <span className="yk-contact__sr">{NEW_TAB}</span>
              </a>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
};

export default ContactView;
