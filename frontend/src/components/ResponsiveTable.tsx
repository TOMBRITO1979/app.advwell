import React from 'react';

interface ResponsiveTableProps {
  children: React.ReactNode;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ children }) => {
  return (
    <div className="w-full overflow-x-auto -mx-3 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTable;
