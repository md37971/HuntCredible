import { createBrowserRouter, Navigate } from 'react-router'
import App from './App.jsx'
import Login from './pages/login.jsx'
import Home from './pages/home.jsx'
import Profile from './pages/profile.jsx'
import Parties from './pages/party.jsx'
import PartyDetail from './pages/partyDetail.jsx'
import Session from './pages/session.jsx'
import SessionLive from './pages/sessionLive.jsx'
import SessionMap from './pages/sessionMap.jsx'
import PartyChat from './pages/partyChat.jsx'
import AnimalDetector from './pages/ai.jsx'
import Competition from './pages/competition.jsx'
import CompetitionDetail from './pages/competitionDetail.jsx'
import CompetitionList from './pages/competitionList.jsx'
import Leaderboard from './pages/leaderboard.jsx'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'profile', element: <Profile /> },
      { path: 'parties', element: <Parties /> },
      { path: 'parties/:partyId', element: <PartyDetail /> },
      { path: 'sessions', element: <Session />},
      { path: 'ai', element: <AnimalDetector />},
      { path: 'competition:competitionId', element: <CompetitionDetail />},
      {
        path: 'competitions',
        element: <Competition />,
        children: [
          { index: true, element: <CompetitionList />},
          { path: 'leaderboard', element: <Leaderboard />},
        ],
      },
      {
        path: 'sessions/:partyId/:sessionId',
        element: <SessionLive />,
        children: [
          { index: true, element: <Navigate to="map" replace /> },
          { path: 'map', element: <SessionMap /> },
          { path: 'chat', element: <PartyChat /> },
        ],
      }
    ],
  },
])