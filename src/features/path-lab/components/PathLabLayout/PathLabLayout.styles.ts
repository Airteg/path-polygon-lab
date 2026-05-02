import styled from "@emotion/styled";

export const Shell = styled.div`
  height: 100vh;
  display: flex;
  background: #0f172a;
  color: #e5e7eb;
`;

export const Sidebar = styled.aside`
  width: 360px;
  min-width: 360px;
  max-width: 360px;
  /* min-height: 100vh; */
  padding: 24px;
  border-right: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.96);
  overflow-y: auto;
  overflow-x: hidden;
`;

export const Playground = styled.main`
  flex: 1;
  min-width: 0;
  /* min-height: 100vh; */
  padding: 24px;
  overflow: hidden;
`;

export const SidebarTitle = styled.div`
  margin-bottom: 24px;

  p {
    margin: 0 0 6px;
    color: #38bdf8;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.15;
  }
`;
