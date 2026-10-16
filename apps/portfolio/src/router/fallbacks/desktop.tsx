import React from "react";
import type { AppDefinition } from "../../contracts/apps";

export function Desktop({ apps }: { apps: AppDefinition[] }): React.ReactElement {
  return (
    <main data-testid="desktop">
      <h1>YK-OS</h1>
      <div data-testid="desktop-icons">
        {apps.map((app) => (
          <div key={app.id} data-testid={`app-icon-${app.id}`}>
            <span>{app.icon}</span>
            <span>{app.title}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
