import { createBrowserRouter } from 'react-router'
import App from './App.jsx'
import Login from './pages/login.jsx'
import Home from './pages/home.jsx'
import Profile from './pages/profile.jsx'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'profile', element: <Profile /> },
      { path: 'login', element: <Login />}
    ],
  },
])