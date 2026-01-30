# KodKod Companion Chrome Extension

This extension allows you to generate resumes and cover letters directly from job board pages using your KodKod Master Profile.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build the Extension**:
    ```bash
    npm run build
    ```

3.  **Load in Chrome**:
    -   Open Chrome and go to `chrome://extensions`.
    -   Enable "Developer mode" in the top right.
    -   Click "Load unpacked".
    -   Select the `dist` folder inside `chrome-extension`.

## Development

-   Run `npm run dev` to start the development server (HMR supported).
-   The extension connects to `http://localhost:3000` by default. Ensure your KodKod webapp is running.

## Features

-   **Side Panel**: Click the extension icon to open the side panel.
-   **Auth**: Automatically detects if you are logged in to KodKod.
-   **Scraping**: Click "Get from Page" to extract job descriptions from the active tab.
-   **Generation**: Select a profile and generate a tailored resume.
