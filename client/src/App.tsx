import { AuthProvider } from "./context/AuthContext";
import { AppRouter } from "./app/routes/AppRouter";

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
