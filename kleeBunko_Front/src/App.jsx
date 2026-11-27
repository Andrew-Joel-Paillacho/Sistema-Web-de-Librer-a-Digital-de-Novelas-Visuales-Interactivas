import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from './components/ProtectedRoute'
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CreatorLayout from "./pages/Creator/CreatorLayout";
import MyStories from "./pages/Creator/MyStories";
import CreateStory from "./pages/Creator/CreateStory";
import { CreatorNavProvider } from "./context/CreatorNavContext";
import Library from "./pages/Library";
import NovelDetails from "./pages/NovelDetails";
import VisualNovelReader from "./pages/VisualNovelReader";
import AdminRoute from './components/AdminRoute'
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Ruta protegida */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}/>
        <Route path="/dashboard/biblioteca" element={<ProtectedRoute><Library /></ProtectedRoute>}/>
        <Route path="/dashboard/leer/:id" element={<ProtectedRoute><NovelDetails /></ProtectedRoute>}/>
        <Route path="/dashboard/leer/:id/read" element={<ProtectedRoute><VisualNovelReader /></ProtectedRoute>}/>
        
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>}/>

        {/* Creator: el layout se renderiza y las hijas van DENTRO vía <Outlet /> */}
        <Route path="/dashboard/crear" element={<ProtectedRoute><CreatorNavProvider><CreatorLayout /></CreatorNavProvider></ProtectedRoute>}>
          {/* index = se muestra en /dashboard/crear (la pestaña "Mis Historias") */}
          <Route index element={<MyStories />} />
          <Route path="editor" element={<CreateStory />} />
          <Route path="editor/:id" element={<CreateStory />} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard/></AdminRoute></ProtectedRoute>}></Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;