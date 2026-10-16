import { Navigate, Route, Routes } from "react-router-dom";
import Homepage from "../components/homepage.jsx";
import RecruiterLoginPage from "../components/recruiter/login-page.jsx";
import CandidateLoginPage from "../components/candidate/login-page.jsx";
import AssessmentsUI from "../components/recruiter/assessments.jsx"
import NewAssessment from "../components/recruiter/newAssessment.jsx"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/recruiter/auth" element={<RecruiterLoginPage />} />
      <Route path="/candidate/auth" element={<CandidateLoginPage />} />
      <Route path="/recruiter/assessments" element={<AssessmentsUI/>}/>
      <Route path="/recruiter/assessments/new" element={<NewAssessment/>}/>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
