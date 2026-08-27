import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import PageTransition from '../components/PageTransition';
import Overview from './Overview';
import PendingApprovals from './PendingApprovals';
import ApprovedProposals from './ApprovedProposals';
import UserManagement from './UserManagement';
import ProposalDetail from './ProposalDetail';
import NewProposal from './NewProposal';
import EditProposal from './EditProposal';
import ProfitabilityAnalyzer from './ProfitabilityAnalyzer';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#150E29]">
      <TopBar />
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Overview />} />
          <Route path="/pending" element={<PendingApprovals />} />
          <Route path="/approved" element={<ApprovedProposals />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/proposal/:id" element={<ProposalDetail />} />
          <Route path="/proposal/:id/edit" element={<EditProposal />} />
          <Route path="/new" element={<NewProposal />} />
          <Route path="/profitability-analyzer" element={<ProfitabilityAnalyzer />} />
        </Routes>
      </PageTransition>
    </div>
  );
};

export default Dashboard;
