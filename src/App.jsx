import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import HomePage from './pages/HomePage';
import VenuePage from './pages/VenuePage';
import ReviewPage from './pages/ReviewPage';
import LoginPage from './pages/LoginPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LangProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/venue/:id" element={<VenuePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/:venueId" element={<ReviewPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  );
}
