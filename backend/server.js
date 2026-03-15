const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cors = require('cors');
const qs = require('querystring');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

//  UiPath Token Logic. This is crucial for authenticating with UiPath's API. Make sure your .env has the correct values.
async function getUiPathToken() {
    const payload = qs.stringify({
        grant_type: 'client_credentials',
        client_id: process.env.UIPATH_CLIENT_ID,
        client_secret: process.env.UIPATH_CLIENT_SECRET,
        scope: 'OR.Execution OR.Folders OR.Jobs'
    });
    const res = await axios.post('https://cloud.uipath.com/identity_/connect/token', payload);
    return res.data.access_token;
}

//  API: Get SAP Orders. This is a simple API call to fetch sales orders from SAP. Adjust the endpoint and parameters as needed.
app.get('/api/sales-orders', async (req, res) => {
    try {
        const response = await axios.get('https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder', {
            headers: { 'APIKey': process.env.SAP_API_KEY },
            params: { '$top': 50, '$format': 'json' }
        });
        res.json(response.data.d.results);
    } catch (e) { res.status(500).send(e.message); }
});

//  API: Trigger Robot Validation. This endpoint receives the order data and callback URL from the frontend, authenticates with UiPath, finds the correct process release, and starts a job with the order data as input.
app.post('/api/validate', async (req, res) => {
    try {
        const { orderData, callbackUrl } = req.body;
        const token = await getUiPathToken();
        const baseUrl = `https://cloud.uipath.com/${process.env.UIPATH_ORG}/${process.env.UIPATH_TENANT}/orchestrator_`;

        const rel = await axios.get(`${baseUrl}/odata/Releases?$filter=Name eq '${process.env.UIPATH_PROCESS_NAME}'`, {
            headers: { Authorization: `Bearer ${token}`, 'X-UIPATH-OrganizationUnitId': process.env.UIPATH_FOLDER_ID }
        });
        
        const releaseKey = rel.data.value[0].Key;
        console.log("Found Release Key:", releaseKey);

        await axios.post(`${baseUrl}/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs`, {
            startInfo: {
                ReleaseKey: releaseKey,
                Strategy: "JobsCount",
                JobsCount: 1,
                InputArguments: JSON.stringify({
                    "in_PayloadJson": JSON.stringify(orderData), // The full SAP object
                    "in_CallbackUrl": callbackUrl,               // Ngrok URL
                    "in_RunId": `RUN-${Date.now()}`,             // Unique ID for this run
                    "in_DocumentId": orderData.order.SalesOrder        // SAP Sales Order ID
                })
            }
        }, { headers: { Authorization: `Bearer ${token}`, 'X-UIPATH-OrganizationUnitId': process.env.UIPATH_FOLDER_ID } });

        res.json({ success: true });
    } catch (error) { 
        if (error.response && error.response.data) {
            console.log(JSON.stringify(error.response.data, null, 2));
        } else {
            console.log("General Error:", error.message);
        }
        
        res.status(500).json({ success: false, message: "Check terminal for details" });
    }
        
});

// API: Callback from UiPath Robot. This endpoint receives the validation results from the UiPath robot. It logs the data and emits a WebSocket event to update the frontend in real-time.
app.post('/api/callback', (req, res) => {

    console.log("--- ROBOT CALLBACK RECEIVED ---");
    console.log(JSON.stringify(req.body, null, 2)); 
    console.log("-------------------------------");
    io.emit('robot-update', req.body); 
    res.sendStatus(200);
});

server.listen(3000, () => console.log("Backend on port 3000"));