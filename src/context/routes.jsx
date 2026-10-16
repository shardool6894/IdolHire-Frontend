import { Navigate, Route, Routes } from "react-router-dom";
import Homepage from "../components/homepage.jsx";
import RecruiterLoginPage from "../components/recruiter/login-page.jsx";
import CandidateLoginPage from "../components/candidate/login-page.jsx";
import AssessmentsUI from "../components/recruiter/assessments.jsx"
import NewAssessment from "../components/recruiter/newAssessment.jsx"
import AssessmentResult from "../components/recruiter/assessmentResult.jsx"
import RecruiterLayout from "../components/recruiter/RecruiterLayout.jsx"
import CandidateLayout from "../components/candidate/CandidateLayout.jsx"
import JoinAssessment from "../components/candidate/joinAssessment.jsx"
import AssessmentTest from "../components/candidate/assessmentTest.jsx"

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/recruiter/auth" element={<RecruiterLoginPage />} />
      <Route path="/candidate/auth" element={<CandidateLoginPage />} />
      <Route element={<RecruiterLayout />}>
        <Route path="/recruiter/assessments" element={<AssessmentsUI />} />
        <Route path="/recruiter/assessments/new" element={<NewAssessment />} />
        <Route path="/recruiter/assessments/:id" element={<AssessmentResult />} />
      </Route>
      <Route element={<CandidateLayout />}>
        <Route path="/candidate/join" element={<JoinAssessment />} />
        <Route path="/candidate/test/:token" element={<AssessmentTest />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
