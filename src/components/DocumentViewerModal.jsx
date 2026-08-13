import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { getFileTypeDetails } from '../utils/fileUtils';

function DocumentViewerModal({ viewedPdf, setViewedPdf }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [fetchedText, setFetchedText] = useState(null);

  useEffect(() => {
    if (viewedPdf?.fileName) {
      const baseUrl = typeof window !== 'undefined' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:3001';
      const url = `${baseUrl}/uploads/${viewedPdf.fileName}`;
      setFileUrl(url);

      const ext = viewedPdf.fileName.split('.').pop().toLowerCase();
      if (['txt', 'json', 'csv', 'md', 'html', 'js', 'css', 'xml'].includes(ext)) {
        fetch(url)
          .then((res) => (res.ok ? res.text() : null))
          .then((text) => setFetchedText(text))
          .catch(() => setFetchedText(null));
      } else {
        setFetchedText(null);
      }
    } else {
      setFileUrl(null);
      setFetchedText(null);
    }
  }, [viewedPdf]);

  if (!viewedPdf) return null;

  const getSimulatedContent = (name = "Unnamed Document") => {
    switch (name) {
      case "Task Description & Copy":
        return {
          title: "TASK REQUIREMENT SPECIFICATION & COPY",
          sections: [
            {
              title: "1. Scope & Description",
              text: "Detailed copy assets and structural requirements for this task module. All UI text string keys must follow standard localized formatting."
            },
            {
              title: "2. Content Guidelines",
              text: "Heading: Task Release Details.\nBody: Empowering interactive module workflows with real-time tracking.\nAction Labels: Submit, View Details, Download Asset."
            }
          ]
        };
      case "UI Text Labels & Form Rules":
        return {
          title: "UI TEXT LABELS & FORM VALIDATION RULES",
          sections: [
            {
              title: "1. Field Validation Specifications",
              text: "Rule A: All text input fields must sanitize special script tags.\nRule B: Target completion dates must be formatted as YYYY-MM-DD.\nRule C: Required upload fields must validate mime-type extensions prior to storage."
            },
            {
              title: "2. Action Button Copy",
              text: "Confirm: Apply Changes.\nCancel: Dismiss Window.\nReject: Submit Feedback Reason."
            }
          ]
        };
      case "Current Affairs Quiz Copy":
        return {
          title: "PROJECT: CURRENT AFFAIRS QUIZ DATABASE",
          sections: [
            {
              title: "1. Questions & Key Solutions",
              text: "Q1: What is the primary purpose of this platform?\nAnswer: Learning discovery and preparation.\n\nQ2: Name the latest Indian state to implement digital education cards.\nAnswer: Tamil Nadu (July 2026)."
            },
            {
              title: "2. Metadata Specifications",
              text: "Difficulty: Medium\nTarget Audience: TNPSC & UPSC aspirants\nTime limit: 60 seconds per module."
            }
          ]
        };
      case "Guidelines & Info Text":
        return {
          title: "CURRENT AFFAIRS SYSTEM REQUIREMENTS DOCUMENT",
          sections: [
            {
              title: "1. Functional Constraints",
              text: "System must support multiple choice formats (MCQ) with 4 options. User scores must persist under local cache state."
            },
            {
              title: "2. Assets Needed",
              text: "Designing team must deliver 1080x1920 wireframe mocks and 1280x300 desktop header selector layouts."
            }
          ]
        };
      case "Labour's Day Celebration Guidelines":
        return {
          title: "LABOUR'S DAY RELEASE CAMPAIGN SPECIFICATIONS",
          sections: [
            {
              title: "1. Copy details",
              text: "Title: Celebrating Our Workers.\nSubtitle: Empowering dreams across sectors.\nOffer: Free aptitude assessment unlocks for all users on May 1st."
            }
          ]
        };
      case "Syllabus Breakdown Documents":
        return {
          title: "TNPSC APTITUDE MODULE SYLLABUS BREAKDOWN",
          sections: [
            {
              title: "1. Quantitative Aptitude Coverage",
              text: "Simplification, Percentage, Highest Common Factor (HCF), Lowest Common Multiple (LCM), Ratio and Proportion."
            },
            {
              title: "2. Logical Reasoning",
              text: "Puzzles, Dice, Visual Reasoning, Alpha-numeric Reasoning, Number Series."
            }
          ]
        };
      case "Study Revision Material Syllabus":
        return {
          title: "PROJECT: STUDENT REVISION PACKAGE MATERIAL",
          sections: [
            {
              title: "1. Module Structure",
              text: "Unit 1: Logical foundations of Mathematics.\nUnit 2: Linear equations and graphical solvers.\nUnit 3: Modern history timeline."
            }
          ]
        };
      case "Task Core Wireframe Layout":
      case "Feature Core Wireframe Layout":
        return {
          title: "DESIGN SPECIFICATION: CORE WIREFRAME LAYOUT",
          sections: [
            {
              title: "1. Mobile Grid Spec (1080 x 1920)",
              text: "Main container height: 100vh.\nHeader bar offset: 64px.\nContent listing: cards with 16px margins, 12px card padding, rounded corners (8px)."
            }
          ]
        };
      case "User Flow Component Assets":
        return {
          title: "DESIGN SPECIFICATION: USER FLOW ASSETS",
          sections: [
            {
              title: "1. Flow steps",
              text: "Step 1: Sign in via username matching.\nStep 2: Access project package lists via left sidebar drawer.\nStep 3: Upload/View requirement documents."
            }
          ]
        };
      case "Dashboard Header Design Mockup":
        return {
          title: "DESIGN SPECIFICATION: DESKTOP HEADER SELECTOR",
          sections: [
            {
              title: "1. Layout elements",
              text: "Brand Logo (Left) -> Staging Environment URL (Center) -> Profile Info with logout trigger action (Right)."
            }
          ]
        };
      default:
        return {
          title: `DOCUMENT CONTENTS: ${name.toUpperCase()}`,
          sections: [
            {
              title: "1. General Specifications & Description",
              text: `This document (${name}) contains the functional copy, module parameters, and specifications for this project release task.`
            },
            {
              title: "2. Integration Guidelines",
              text: "All uploaded document rules must be respected during design, development, and testing phases."
            }
          ]
        };
    }
  };

  const displayName = viewedPdf.name || viewedPdf.fileName || "Unnamed File";
  const fileContent = getSimulatedContent(displayName);
  const typeInfo = getFileTypeDetails(viewedPdf.fileName);
  const ext = viewedPdf.fileName ? viewedPdf.fileName.split('.').pop().toLowerCase() : '';
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
  const userFriendlyFileName = viewedPdf.fileName ? viewedPdf.fileName.substring(viewedPdf.fileName.indexOf('-') + 1) : '';

  const renderViewportContent = () => {
    if (isVideo && fileUrl) {
      return (
        <video 
          src={fileUrl} 
          controls 
          autoPlay
          className="doc-image-preview" 
          style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '12px' }}
        >
          <track kind="captions" src="" label="English" default />
        </video>
      );
    }

    if (isImage && fileUrl) {
      return (
        <img 
          src={fileUrl} 
          alt={displayName} 
          className="doc-image-preview" 
        />
      );
    }

    if (isPdf && fileUrl) {
      return (
        <div className="d-flex flex-col gap-4 w-full h-full">
          <object 
            data={fileUrl} 
            type="application/pdf" 
            width="100%" 
            height="500px" 
            className="w-full"
            style={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
          >
            <iframe 
              src={fileUrl} 
              width="100%" 
              height="500px" 
              className="w-full" 
              title={userFriendlyFileName} 
            />
          </object>
          <div className="doc-paper-view-container">
            <div className="doc-paper-sheet">
              <header className="doc-paper-header">
                <h1 className="doc-paper-title">{fileContent.title}</h1>
                <span className="doc-paper-subtitle">Project Internal Release Package · {userFriendlyFileName || displayName}</span>
              </header>

              <div className="flex-grow-1">
                {fileContent.sections.map((section) => (
                  <section key={section.title} className="doc-paper-section">
                    <h2 className="doc-paper-sec-title">{section.title}</h2>
                    <p className="doc-paper-sec-text">{section.text}</p>
                  </section>
                ))}
              </div>

              <footer className="doc-paper-footer">
                <span>Strictly Confidential</span>
                <span>Page 1 of 1</span>
              </footer>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="doc-paper-view-container">
        <div className="doc-paper-sheet">
          <header className="doc-paper-header">
            <h1 className="doc-paper-title">{fileContent.title}</h1>
            <span className="doc-paper-subtitle">Project Internal Release Package · {userFriendlyFileName || displayName}</span>
          </header>

          <div className="flex-grow-1">
            {fetchedText && (
              <section className="doc-paper-section mb-4">
                <h2 className="doc-paper-sec-title">Uploaded File Content Preview</h2>
                <pre className="doc-paper-sec-text" style={{ fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px' }}>
                  {fetchedText}
                </pre>
              </section>
            )}

            {fileContent.sections.map((section) => (
              <section key={section.title} className="doc-paper-section">
                <h2 className="doc-paper-sec-title">{section.title}</h2>
                <p className="doc-paper-sec-text">{section.text}</p>
              </section>
            ))}
          </div>

          {fileUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md d-flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs text-muted font-semibold">Attached File: {userFriendlyFileName || displayName} ({viewedPdf.fileSize || 'File'})</span>
              <a
                href={fileUrl}
                download={userFriendlyFileName || displayName}
                className="ui-btn ui-btn-primary ui-btn-sm text-decoration-none"
              >
                Download Document
              </a>
            </div>
          )}

          <footer className="doc-paper-footer">
            <span>Strictly Confidential</span>
            <span>Page 1 of 1</span>
          </footer>
        </div>
      </div>
    );
  };

  return ReactDOM.createPortal(
    <dialog
      className="modal-overlay"
      open
      aria-modal="true"
    >
      <button
        type="button"
        className="modal-backdrop-btn"
        onClick={() => setViewedPdf(null)}
        aria-label="Close modal backdrop"
      />
      <div className="modal-content doc-modal-container">
        <div className="doc-modal-header">
          <div>
            <h2 className="modal-title mb-0">File Preview Reader</h2>
            <span className="text-sm text-muted">File: {userFriendlyFileName || displayName} ({viewedPdf.fileSize || 'File'})</span>
          </div>
          <div className="d-flex items-center gap-2">
            {fileUrl && (
              <a
                href={fileUrl}
                download={userFriendlyFileName || displayName}
                target="_blank"
                rel="noreferrer"
                className="ui-btn ui-btn-primary ui-btn-sm d-inline-flex items-center gap-2 text-decoration-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download File
              </a>
            )}
            <button type="button" onClick={() => setViewedPdf(null)} className="ui-btn ui-btn-secondary ui-btn-sm">
              Close Reader
            </button>
          </div>
        </div>

        <div className="doc-preview-viewport">
          {renderViewportContent()}
        </div>
      </div>
    </dialog>,
    document.body
  );
}

export default DocumentViewerModal;
