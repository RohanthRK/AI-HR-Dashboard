import React from 'react';

const PageHeader = ({ title, subtitle }) => {
  return (
    <div className="mb-4">
      <h2 className="mb-1">{title}</h2>
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </div>
  );
};

export default PageHeader; 