import React, { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import Overview from './Overview';
import MyProposals from './MyProposals';
import PendingApprovals from './PendingApprovals';
import ApprovedProposals from './ApprovedProposals';
import UserManagement from './UserManagement';
import ProposalDetail from './ProposalDetail';
import NewProposal from './NewProposal';
import EditProposal from './EditProposal';
import ProfitabilityHub from './ProfitabilityHub';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F4FC]">
      <TopBar onMenuToggle={() => setMobileMenuOpen((open) => !open)} />
      <div className="flex min-h-[calc(100vh-4rem)] items-start">
        <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main id="main-content" className="min-w-0 flex-1 w-full">
      <PageTransition key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Overview />} />
          <Route path="/my-proposals" element={<MyProposals />} />
          <Route path="/pending" element={<PendingApprovals />} />
          <Route path="/approved" element={<ApprovedProposals />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/proposal/:id" element={<ProposalDetail />} />
          <Route path="/proposal/:id/edit" element={<EditProposal />} />
          <Route path="/new" element={(user?.role === 'Admin' || user?.can_create_proposals === true) ? <NewProposal /> : <Navigate to="/dashboard" replace />} />
          <Route path="/profitability-analyzer" element={<ProfitabilityHub />} />
        </Routes>
      </PageTransition>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
