import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';

interface Props {
  children: React.ReactNode;
  activeSection: string;
}

const AdminPageLayout: React.FC<Props> = ({ children, activeSection }) => {
  const [section, setSection] = useState(activeSection);
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0F172A' }}>
      <AdminTopBar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar activeSection={section} onSectionChange={setSection} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminPageLayout;
