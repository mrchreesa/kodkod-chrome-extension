// Simple print page - no React needed, just vanilla JS
const content = localStorage.getItem('kodkod_print_content');
const title = localStorage.getItem('kodkod_print_title');

if (content) {
  // The content is a full HTML document, so we need to write it properly
  // First, update the title in the content if needed
  let printContent = content;
  
  if (title) {
    printContent = printContent.replace(
      /<title>[^<]*<\/title>/,
      `<title>${title}</title>`
    );
  }
  
  // Add print-optimized styles
  printContent = printContent.replace(
    '</head>',
    `<style>
      @media print {
        body { padding: 0 !important; margin: 0 !important; }
        @page { margin: 0.5in; size: letter; }
      }
    </style>
    </head>`
  );
  
  // Write the full document (this replaces the entire page)
  document.open();
  document.write(printContent);
  document.close();
  
  // Trigger print after a short delay to ensure styles/images load
  setTimeout(() => {
    window.print();
  }, 500);
} else {
  document.body.innerHTML = '<div style="padding: 20px; font-family: sans-serif;">No content to print. Please try again.</div>';
}
