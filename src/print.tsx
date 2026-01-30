import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import global styles if needed, or just rely on injected styles

const PrintPage = () => {
  const hasPrinted = React.useRef(false);

  useEffect(() => {
    if (hasPrinted.current) return;
    hasPrinted.current = true;

    const content = localStorage.getItem('kodkod_print_content');
    const title = localStorage.getItem('kodkod_print_title');

    if (content) {
      // Set the document title for the PDF filename
      if (title) {
        document.title = title;
      }

      // Inject the content
      document.body.innerHTML = content;

      // Inject print styles
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          body { padding: 0 !important; margin: 0 !important; }
          @page { margin: 0.5in; size: letter; }
        }
      `;
      document.head.appendChild(style);

      // Trigger print after a short delay to ensure styles/images load
      setTimeout(() => {
        window.print();
        // Optional: Close window after print (users might want to keep it open though)
        // window.close(); 
      }, 500);
    } else {
      document.body.innerHTML = '<div style="padding: 20px; font-family: sans-serif;">No content to print. Please try again.</div>';
    }
  }, []);

  return null; // We are replacing body innerHTML, so we don't render anything here
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrintPage />
  </React.StrictMode>
);
