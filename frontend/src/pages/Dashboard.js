import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
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
    <div className="flex min-h-screen bg-[#F4F4F5]">
      <Sidebar />
      <div className="flex-1">
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
    </div>
  );
};

export default Dashboard;
