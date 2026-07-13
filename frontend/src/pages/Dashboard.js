import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Overview from './Overview';
import PendingApprovals from './PendingApprovals';
import ApprovedProposals from './ApprovedProposals';
import UserManagement from './UserManagement';
import ProposalDetail from './ProposalDetail';
import NewProposal from './NewProposal';
import EditProposal from './EditProposal';

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#F4F4F5]">
      <Sidebar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/pending" element={<PendingApprovals />} />
          <Route path="/approved" element={<ApprovedProposals />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/proposal/:id" element={<ProposalDetail />} />
          <Route path="/proposal/:id/edit" element={<EditProposal />} />
          <Route path="/new" element={<NewProposal />} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;