
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DeckViewer from "./pages/DeckViewer";

function App() {
  const path = window.location.pathname;
  const loggedIn = Boolean(localStorage.getItem("user"));

  if (path === "/dashboard" && loggedIn) {
    return <Dashboard />;
  }

  if (path.startsWith("/deck/") && loggedIn) {
    const deckId = path.split("/")[2];

    return <DeckViewer deckId={deckId} />;
  }

  if (path === "/register") {
    return <Register />;
  }

  return <Login />;
}

export default App;
