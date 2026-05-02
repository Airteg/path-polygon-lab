import type { ReactNode } from "react";

import {
  Playground,
  Shell,
  Sidebar,
  SidebarTitle,
} from "./PathLabLayout.styles";

type PathLabLayoutProps = {
  sidebar: ReactNode;
  playground: ReactNode;
};

export function PathLabLayout({ sidebar, playground }: PathLabLayoutProps) {
  return (
    <Shell>
      <Sidebar>
        <SidebarTitle>
          <p>Path Polygon Lab</p>
          <h1>SVG path sampling</h1>
        </SidebarTitle>

        {sidebar}
      </Sidebar>

      <Playground>{playground}</Playground>
    </Shell>
  );
}
