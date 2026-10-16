import type { AppDefinition, AppId, AppProps } from "../../contracts/apps";

export interface ContactLinks {
  linkedin: string;
  github: string;
  medium: string;
}

export interface ContactData {
  name: string;
  headline: string;
  location: string;
  email: string;
  links: ContactLinks;
}

export interface ContactAppProps extends Partial<AppProps> {
  contact?: ContactData;
}

export type { AppDefinition, AppId, AppProps };
