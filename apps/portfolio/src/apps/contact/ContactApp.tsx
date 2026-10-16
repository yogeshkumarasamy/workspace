import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ContactAppProps, ContactData } from "./types";
import { verifiedContact } from "./__fixtures__/contact";
import "./contact.css";

export const ContactApp: React.FC<ContactAppProps> = ({ contact: contactProp }) => {
  const contact: ContactData = contactProp ?? verifiedContact;
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopyEmail = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    let copied = false;

    // Primary: modern Clipboard API
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(contact.email);
        copied = true;
      } catch {
        copied = false;
      }
    }

    // Fallback: execCommand for environments where Clipboard API is blocked or restricted
    if (!copied && typeof document !== "undefined" && typeof document.execCommand === "function") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = contact.email;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopyStatus("success");
      setStatusMessage("Email copied to clipboard!");
    } else {
      setCopyStatus("error");
      setStatusMessage("Failed to copy email.");
    }

    timeoutRef.current = setTimeout(() => {
      setCopyStatus("idle");
      setStatusMessage("");
    }, 3000);
  }, [contact.email]);

  return (
    <div className="yk-contact-app" data-testid="contact-app">
      <header className="yk-contact-header">
        <p className="yk-contact-banner">C:\PORTFOLIO\CONTACT.LNK</p>
        <h1 className="yk-contact-name">{contact.name}</h1>
        <p className="yk-contact-headline">{contact.headline}</p>
        <p className="yk-contact-location">{contact.location}</p>
      </header>

      <hr className="yk-contact-divider" aria-hidden="true" />

      {/* Primary Recruiter Action: Direct Email */}
      <section className="yk-contact-section" aria-labelledby="contact-heading-email">
        <h2 id="contact-heading-email" className="yk-contact-section-title">
          Direct Email
        </h2>
        <div className="yk-contact-email-box yk-bevel-in">
          <div className="yk-contact-email-display">
            <span className="yk-contact-email-text" data-testid="contact-email">
              {contact.email}
            </span>
            <div className="yk-contact-button-row">
              <a
                href={`mailto:${contact.email}`}
                className="yk-contact-btn"
                data-testid="contact-mailto-link"
                aria-label={`Send email to ${contact.email}`}
              >
                <span aria-hidden="true">✉</span>
                <span>Send Email</span>
              </a>
              <button
                type="button"
                className="yk-contact-btn"
                data-testid="contact-copy-btn"
                onClick={handleCopyEmail}
                aria-label="Copy email address to clipboard"
              >
                <span aria-hidden="true">📋</span>
                <span>Copy Email</span>
              </button>
            </div>
          </div>
          {/* Accessible status live region */}
          <div
            role="status"
            aria-live="polite"
            data-testid="contact-copy-status"
            className={`yk-contact-status ${copyStatus === "error" ? "yk-contact-status--error" : ""}`}
          >
            {statusMessage}
          </div>
        </div>
      </section>

      {/* Social & Professional Links */}
      <section className="yk-contact-section" aria-labelledby="contact-heading-profiles">
        <h2 id="contact-heading-profiles" className="yk-contact-section-title">
          Online Profiles
        </h2>
        <div className="yk-contact-links-grid" role="list" aria-label="Social and professional profiles">
          <a
            role="listitem"
            href={contact.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="yk-contact-social-link"
            data-testid="contact-link-linkedin"
            aria-label="Visit Yogesh Kumarasamy's LinkedIn profile (opens in new tab)"
          >
            <span aria-hidden="true">🔗</span>
            <span>LinkedIn</span>
          </a>
          <a
            role="listitem"
            href={contact.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="yk-contact-social-link"
            data-testid="contact-link-github"
            aria-label="Visit Yogesh Kumarasamy's GitHub profile (opens in new tab)"
          >
            <span aria-hidden="true">🐙</span>
            <span>GitHub</span>
          </a>
          <a
            role="listitem"
            href={contact.links.medium}
            target="_blank"
            rel="noopener noreferrer"
            className="yk-contact-social-link"
            data-testid="contact-link-medium"
            aria-label="Read Yogesh Kumarasamy's articles on Medium (opens in new tab)"
          >
            <span aria-hidden="true">✍</span>
            <span>Medium</span>
          </a>
        </div>
      </section>

      <footer className="yk-contact-footer" aria-label="Contact note">
        <span>Direct connection • No form required • Fast response</span>
      </footer>
    </div>
  );
};

export default ContactApp;
