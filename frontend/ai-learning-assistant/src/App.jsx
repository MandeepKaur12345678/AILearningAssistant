import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";

// Yeh subfolder structure ke according import karo
import DashboardPage from "./pages/Dashboard/DashboardPage";  // Notice: /Dashboard/DashboardPage
import DocumentListPage from "./pages/Documents/DocumentListPage";  // /Documents/DocumentListPage
import DocumentDetailPage from "./pages/Documents/DocumentDetailPage";  // /Documents/DocumentDetailPage
import FlashcardsListPage from "./pages/Flashcards/FlashcardsListPage";  // /Flashcards/FlashcardsListPage
import FlashcardPage from "./pages/Flashcards/FlashcardPage";  // /Flashcards/FlashcardPage
import QuizTakePage from "./pages/Quizzes/QuizTakePage";  // /Quizzes/QuizTakePage
import QuizResultPage from "./pages/Quizzes/QuizResultPage";  // /Quizzes/QuizResultPage
import ProfilePage from "./pages/Profile/ProfilePage";  // /Profile/ProfilePage

import ProtectedRoute from "./components/auth/ProtectedRoute";

const App = () => {
  const isAuthenticated = false;
  const loading = false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/flashcards" element={<FlashcardsListPage />} />
          <Route path="/documents/:id/flashcards" element={<FlashcardPage />} />
          <Route path="/quizzes/:quizId" element={<QuizTakePage />} />
          <Route path="/quizzes/:quizId/results" element={<QuizResultPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
};

export default App;