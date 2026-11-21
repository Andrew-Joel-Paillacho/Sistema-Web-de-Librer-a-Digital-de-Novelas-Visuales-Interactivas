import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children, requireMaster = false }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token || !user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  if (requireMaster && user.role !== 'master') return <Navigate to="/admin" replace />;

  return children;
};

export default AdminRoute;