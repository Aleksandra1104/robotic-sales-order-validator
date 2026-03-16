# SAP UiPath Order Validation

A full-stack application that integrates SAP Business Accelerator Hub (Sandbox) sales orders with UiPath robotic process automation for automated order validation. Includes a complete UiPath workflow, SAP UI5 frontend, Node.js backend with WebSocket real-time updates, and UiPath Orchestrator integration.

**Technologies:** SAP UI5, Node.js, Express, Socket.IO, UiPath RPA, SAP Business Accelerator Hub API

**Features:**
- Real-time sales order display and validation triggering
- Automated UiPath robot job execution
- Live status updates (Idle → Pending → Approved/Blocked)
- Mass validation with progress tracking
- WebSocket-based callback handling

**Project Structure:**
- `frontend/` - SAP UI5 application for order management and robot triggering
- `backend/` - Node.js server with SAP API integration and UiPath Orchestrator connection
- `uipath/` - Complete UiPath Studio project with ready-to-deploy workflow for order validation

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- UiPath Automation Cloud account
- SAP API Business Hub account

### Environment Variables

This application requires several environment variables for API authentication. Create a `.env` file in the `backend/` directory with the following variables:

#### UiPath Orchestrator Configuration
1. **UIPATH_CLIENT_ID** and **UIPATH_CLIENT_SECRET**
   - Go to [UiPath Automation Cloud](https://cloud.uipath.com/)
   - Navigate to Admin → External Applications
   - Click "Add Application"
   - Set Application Type to "Confidential application"
   - Add scopes: `OR.Execution`, `OR.Folders`, `OR.Jobs`
   - Copy the Client ID and Client Secret

2. **UIPATH_ORG**
   - Your UiPath organization ID (found in the URL right after `https://cloud.uipath.com/` )

3. **UIPATH_TENANT**
   - Your UiPath tenant name, for example, `DefaultTenant`.

4. **UIPATH_FOLDER_ID**
   - Go to Orchestrator → Folders
   - Select your folder and copy the ID from the URL (right after `fid=`)

5. **UIPATH_PROCESS_NAME**
   - The name of your UiPath process as it appears in Orchestrator

#### SAP API Configuration
6. **SAP_API_KEY**
   - Go to [SAP API Business Hub](https://api.sap.com/)
   - Sign in with your SAP account
   - Navigate to the Sales Order API
   - Click "Show API Key" and copy the key

7. **CALLBACK_URL**
   - The URL where UiPath robots will send validation results back to your application
   - Use ngrok or similar tunneling service to expose your local backend: `ngrok http 3000`
   

### Installation

1. Clone the repository
2. Navigate to the backend directory: `cd backend`
3. Install dependencies: `npm install`
4. Create your `.env` file with the variables listed above
5. Start the backend: `node server.js`

6. Navigate to the frontend directory: `cd ../frontend`
7. Install dependencies: `npm install`
8. Start the frontend: `npm start`

### UiPath Process Deployment

1. Open the `uipath/` folder in UiPath Studio
2. Publish the process to your Orchestrator
3. Note the process name for the `UIPATH_PROCESS_NAME` environment variable

**Database Configuration Note:** The project includes a SQLite database file (`Data/MustangERP.db`) used for order validation. If you encounter issues publishing the process to Orchestrator due to the database file:
- Move the `Data/MustangERP.db` file to a location on your local machine (outside the project folder)
- Update the `dbConnectionString` in `uipath/Config.json` to point to the new location, e.g.:
  ```
  "dbConnectionString": "Driver={SQLite3 ODBC Driver};Database=C:\\Path\\To\\Your\\MustangERP.db;"
  ```
- Ensure the robot has access to the new database location

https://github.com/user-attachments/assets/87ddd6c9-182f-4fb1-b25c-8ff65121235a

https://github.com/user-attachments/assets/15bf865e-3d25-4ac2-a0a4-5113fdb64f1c

<p align="center">
  <img width="600" height="665" alt="Image" src="https://github.com/user-attachments/assets/c9a26470-326c-4f73-8b82-e873398241e1" />
</p>

