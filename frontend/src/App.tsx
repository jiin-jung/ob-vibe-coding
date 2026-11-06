import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PlayPage from "./pages/PlayPage";
import RankingPage from "./pages/RankingPage";
import ResultPage from "./pages/ResultPage";
import StartPage from "./pages/StartPage";

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/play/:id" element={<PlayPage />} />
        <Route path="/result/:id" element={<ResultPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
