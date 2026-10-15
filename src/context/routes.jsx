import { Navigate, Route, Routes } from "react-router-dom";
import Homepage from "../components/homepage.jsx";
import RecruiterLoginPage from "../components/recruiter-login-page.jsx";
import CandidateLoginPage from "../components/candidate-login-page.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/recruiter" element={<RecruiterLoginPage />} />
      <Route path="/candidate" element={<CandidateLoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
