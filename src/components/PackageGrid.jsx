import React from 'react';

function PackageGrid({
  filteredPackages,
  onSelect,
  renderStatus,
  onApproveAdmin,
  canManageTask,
  canManageFeature,
  onEditTask,
  onEditFeature,
  onDeleteTask,
  onDeleteFeature,
}) {
  const allowManage = canManageTask ?? canManageFeature;
  const editHandler = onEditTask ?? onEditFeature;
  const deleteHandler = onDeleteTask ?? onDeleteFeature;

  if (filteredPackages.length === 0) {
    return (
      <div className="p-6 text-center ui-card border-dashed text-muted">
        No Tasks created yet.
      </div>
    );
  }

  return (
    <div className="package-grid">
      {filteredPackages.map((pkg) => {
        const { label, badgeClass, linkText, linkColor } = renderStatus(pkg);
        return (
          <div
            key={pkg.id}
            role="button"
            tabIndex={0}
            aria-label={`Open Task ${pkg.name}`}
            onClick={() => onSelect(pkg.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(pkg.id);
              }
            }}
            className="package-card ui-card ui-card-interactive d-flex flex-col justify-between cursor-pointer w-full text-left"
          >
            <div>
              <div className="d-flex justify-between items-center flex-wrap gap-2 mb-2">
                <span className="asset-size-tag text-xs">Task</span>
                <div className="d-flex items-center gap-2 flex-wrap">
                  {allowManage && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editHandler) editHandler(pkg);
                        }}
                        className="ui-btn ui-btn-outline ui-btn-xs"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (deleteHandler) deleteHandler(pkg.id, pkg.name);
                        }}
                        className="ui-btn ui-btn-danger ui-btn-xs"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              <h3 className="package-name mt-1 mb-1 text-lg font-extrabold text-main">
                {pkg.name}
              </h3>
              <p className="text-xs text-muted mb-1">Project: {pkg.project}</p>
              {pkg.dueDate && (
                <div className="mt-1">
                  <span className="ui-badge ui-badge-sm font-bold" style={{ backgroundColor: '#fef9c3', color: '#854d0e', borderColor: '#fde047' }}>
                    Due: {pkg.dueDate}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-top d-flex justify-between items-center flex-wrap gap-2">
              <span
                className="text-xs font-bold text-primary-color p-0 border-0 bg-transparent"
                style={{ color: linkColor }}
              >
                {linkText} &rarr;
              </span>
              <div className="d-flex items-center gap-2">
                <span className={`status-badge ${badgeClass} text-xs`}>
                  {label}
                </span>

                {onApproveAdmin && !pkg.finalAdminApproved && !pkg.deployed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!pkg.testingTlApproved) {
                        alert('Cannot approve final release: Test pass has not been approved by the Testing team yet.');
                        return;
                      }
                      onApproveAdmin(pkg.id);
                    }}
                    disabled={!pkg.testingTlApproved}
                    className={`ui-btn ui-btn-success ui-btn-xs text-white font-extrabold ${!pkg.testingTlApproved ? 'btn-disabled cursor-not-allowed opacity-60' : ''}`}
                    style={{ backgroundColor: pkg.testingTlApproved ? '#4f46e5' : '#94a3b8', borderColor: pkg.testingTlApproved ? '#4338ca' : '#64748b', whiteSpace: 'nowrap' }}
                  >
                    {pkg.testingTlApproved ? 'Approve Final Release \u2192' : 'Pending Test Pass'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PackageGrid;
