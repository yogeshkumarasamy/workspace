import React from "react";
import type { AppProps } from "./types";
import { ContactView } from "./ContactView";
import { profile } from "../../content/profile";

export const ContactApp: React.FC<AppProps> = ({ windowId }) => {
  return <ContactView windowId={windowId} profile={profile} />;
};

export default ContactApp;
