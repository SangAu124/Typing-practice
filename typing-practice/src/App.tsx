import React from 'react';
import styled from 'styled-components';
import TypingGame from './components/TypingGame';
import GlobalStyle from './styles/GlobalStyle';

const AppContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Title = styled.h1`
  color: var(--text-primary);
  font-size: 2rem;
  margin-bottom: 2rem;
  font-weight: 700;
  letter-spacing: 1px;
`;

function App() {
  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <Title>타자 연습</Title>
        <TypingGame />
      </AppContainer>
    </>
  );
}

export default App;
