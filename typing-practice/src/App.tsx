import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';
import TypingGame from './components/TypingGame';
import BattleGame from './components/BattleGame';
import GlobalStyle from './styles/GlobalStyle';

const Container = styled.div`
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
`;

const Nav = styled.nav`
  padding: 20px;
  background-color: var(--bg-secondary);
  margin-bottom: 20px;
  
  ul {
    max-width: 800px;
    margin: 0 auto;
    padding: 0;
    list-style: none;
    display: flex;
    gap: 20px;
  }
  
  a {
    color: var(--text-primary);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 4px;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: var(--accent-secondary);
    }
  }
`;

// URL 파라미터를 확인하는 컴포넌트
const RoomRedirect: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const roomId = params.get('room');

  if (roomId) {
    return <Navigate to={`/battle/${roomId}`} replace />;
  }

  return <TypingGame />;
};

const BattleGamePage: React.FC = () => {
  const { roomId } = useParams();

  return <BattleGame roomId={roomId} />;
};

const App: React.FC = () => {
  return (
    <Router>
      <GlobalStyle />
      <Container>
        <Nav>
          <ul>
            <li><Link to="/">연습 모드</Link></li>
            <li><Link to="/battle">대결 모드</Link></li>
          </ul>
        </Nav>
        <Routes>
          <Route path="/" element={<RoomRedirect />} />
          <Route path="/battle/:roomId" element={<BattleGamePage />} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;
