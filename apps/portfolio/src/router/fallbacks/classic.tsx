import React from "react";
import type { Profile } from "../../contracts/content";

export function ClassicView({ profile }: { profile: Profile }): React.ReactElement {
  return (
    <main data-testid="classic-view">
      <h1>{profile.name}</h1>
      <p>{profile.headline}</p>
      <p>{profile.location}</p>
      <p>{profile.email}</p>
    </main>
  );
}
