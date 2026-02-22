# 2026 FMCA Payment Voucher - Finance and Accounts Department

A web application for the Finance and Accounts Department to manage payment vouchers, integrated with Firebase for Authentication, Firestore Database, and Cloud Storage.

## Prerequisites

To properly run this application locally and communicate with Firebase without CORS errors, the files must be served over an HTTP web server (not opened directly via `file://`).

- **Option A**: [Node.js and npm](https://nodejs.org/) (to use the Firebase CLI)
- **Option B**: Visual Studio Code with the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
- **Option C**: Python (for a quick local development server)

## How to Run Locally

### Option 1: Using Firebase CLI (Recommended)
Since the app uses Firebase Hosting features (like `cleanUrls`), using the Firebase CLI provides the most accurate local testing environment.

1. Install the Firebase CLI globally (requires Node.js):
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to Firebase (if you haven't already):
   ```bash
   firebase login
   ```
3. Start the local Firebase server from the root of the project:
   ```bash
   firebase serve
   ```
   *(Alternatively, you can use `firebase emulators:start` if using Local Emulators)*
4. Open the provided `localhost` URL (usually `http://localhost:5000`) in your web browser.

### Option 2: Using VS Code (Live Server)
1. Open the project folder (`payable-voucher-2026`) in **Visual Studio Code**.
2. Install the **Live Server** extension by Ritwick Dey from the VS Code Extensions pane.
3. Open `index.html` in the editor.
4. Click **"Go Live"** in the bottom right corner of the VS Code status bar, or right-click the `index.html` file and select **"Open with Live Server"**.
5. The application will instantly open in your default browser at `http://127.0.0.1:5500`.

### Option 3: Using Python
If you have Python installed, you can start a simple server directly from your terminal/command prompt.

1. Open a terminal in the project directory.
2. Run the following command (for Python 3):
   ```bash
   python -m http.server 8000
   ```
3. Navigate to `http://localhost:8000` in your web browser.

## Deployment

To deploy any new updates live to Firebase Hosting:
```bash
firebase deploy --only hosting
```