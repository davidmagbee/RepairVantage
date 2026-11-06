import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PrivateRoute, { GuestRoute } from './components/PrivateRoute';
import AcceptInvitation from './pages/AcceptInvitation';
import Inventory from './pages/Inventory';
import Landing from './pages/Landing';
import Login from './pages/Login';
import NewProject from './pages/NewProject';
import NotFound from './pages/NotFound';
import ProjectDetails from './pages/ProjectDetails';
import ProjectList from './pages/ProjectList';
import ProjectReport from './pages/ProjectReport';
import Schedule from './pages/Schedule';
import Showcase from './pages/Showcase';

export default function App() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="invite" element={<AcceptInvitation />} />
      <Route path="showcase/:slug" element={<Showcase />} />
      <Route element={<GuestRoute />}>
        <Route path="login" element={<Login key="login" />} />
        <Route path="register" element={<Login key="register" createAccount />} />
      </Route>
      <Route element={<PrivateRoute />}>
        <Route path="projects" element={<Layout />}>
          <Route index element={<ProjectList />} />
          <Route path="new" element={<NewProject />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path=":id" element={<ProjectDetails />} />
          <Route path=":id/report" element={<ProjectReport />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
