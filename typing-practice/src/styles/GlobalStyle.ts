import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  :root {
    --bg-primary: #1e1e1e;
    --bg-secondary: #252525;
    --text-primary: #e2b714;
    --text-secondary: #646669;
    --text-tertiary: #d1d0c5;
    --accent-primary: #e2b714;
    --accent-secondary: #2c2c2c;
    --error: #ca4754;
    --success: #4ca64c;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background-color: var(--bg-primary);
    color: var(--text-tertiary);
    font-family: 'Roboto Mono', monospace;
    min-height: 100vh;
    overflow-x: hidden;
  }

  ::selection {
    background: var(--accent-primary);
    color: var(--bg-primary);
  }
`;

export default GlobalStyle;
