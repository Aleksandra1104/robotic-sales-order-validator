sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("my.app.controller.Main", {

        onInit: async function () {
            // Load callback URL from backend
            try {
                const res = await fetch("http://localhost:3000/api/callback-url");
                const data = await res.json();
                this.callbackUrl = data.callbackUrl;
            } catch (err) {
                console.error("Failed to load callback URL", err);
                this.callbackUrl = ""; // fallback
            }

            this.loadData();
            
            // 1. Initialize UI Model for Progress and Buttons
            const oUIModel = new JSONModel({
                isProcessing: false,
                isNotProcessing: true,
                shouldStop: false,
                progressPercent: 0,
                progressText: ""
            });
            this.getView().setModel(oUIModel, "ui");

            const socket = io("http://localhost:3000");
            socket.on("robot-update", (data) => this._handleUpdate(data));
        },

        loadData: async function () {
            try {
                const res = await fetch("http://localhost:3000/api/sales-orders");
                const data = await res.json();
                const formatted = data.map(o => ({ ...o, RobotStatus: "Idle", StatusColor: "None", LastError: "" }));
                this.getView().setModel(new JSONModel(formatted), "salesModel");
            } catch (err) {
                console.error("Failed to load data", err);
            }
        },

        onSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query");
            const oBinding = this.byId("ordersTable").getBinding("items");
            oBinding.filter(sQuery ? [new sap.ui.model.Filter("SoldToParty", "Contains", sQuery)] : []);
        },

        onValidateSingle: function (oEvent) {
            const oPath = oEvent.getSource().getBindingContext("salesModel").getPath();
            this._triggerRobot(oPath);
        },

        onValidateAll: async function () {
            const oUIModel = this.getView().getModel("ui");
            const oSalesModel = this.getView().getModel("salesModel");
            const aData = oSalesModel.getData();
            const iTotal = aData.length;

            // Reset UI State
            oUIModel.setProperty("/isProcessing", true);
            oUIModel.setProperty("/isNotProcessing", false);
            oUIModel.setProperty("/shouldStop", false);
            oUIModel.setProperty("/progressPercent", 0);

            for (let i = 0; i < iTotal; i++) {
                // Check if user clicked "Stop"
                if (oUIModel.getProperty("/shouldStop")) {
                    break;
                }

                // Update Progress
                let iPercent = Math.round(((i + 1) / iTotal) * 100);
                oUIModel.setProperty("/progressPercent", iPercent);
                oUIModel.setProperty("/progressText", `Triggering ${i + 1} of ${iTotal}...`);

                // Trigger and wait for the HTTP request to finish
                await this._triggerRobot("/" + i);

                // Small delay to prevent network congestion
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Cleanup UI State
            oUIModel.setProperty("/isProcessing", false);
            oUIModel.setProperty("/isNotProcessing", true);
            
            const sMsg = oUIModel.getProperty("/shouldStop") ? "Mass validation stopped." : "All robots triggered!";
            MessageToast.show(sMsg);
        },

        // Function to handle the Stop button
        onStopValidation: function () {
            this.getView().getModel("ui").setProperty("/shouldStop", true);
        },

        _triggerRobot: function (sPath) {
            const oModel = this.getView().getModel("salesModel");
            const oOrder = oModel.getProperty(sPath);

            oModel.setProperty(sPath + "/RobotStatus", "Starting...");
            oModel.setProperty(sPath + "/StatusColor", "Warning");

            const oPayload = {
                "orderData": { "order": oOrder },
                "callbackUrl": this.callbackUrl
            };

            return fetch("http://localhost:3000/api/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oPayload)
            })
            .then(response => {
                if (!response.ok) throw new Error("HTTP " + response.status);
                return response.json();
            })
            .catch(err => {
                oModel.setProperty(sPath + "/RobotStatus", "Error");
                oModel.setProperty(sPath + "/StatusColor", "Error");
                console.error("Robot Trigger Failed:", err);
            });
        },

        _handleUpdate: function (data) {
            const oModel = this.getView().getModel("salesModel");
            const aData = oModel.getData();
            const idx = aData.findIndex(o => o.SalesOrder === data.documentId);

            if (idx !== -1) {
                const sPath = `/${idx}/`;
                let statusText, statusColor;
                
                if (data.status === "pending") {
                    statusText = "Pending";
                    statusColor = "Warning"; // Orange color
                } else if (data.status === "approved") {
                    statusText = "Approved";
                    statusColor = "Success";
                } else if (data.status === "blocked") {
                    statusText = "Blocked";
                    statusColor = "Error";
                } else {
                    statusText = "Unknown";
                    statusColor = "None";
                }
                
                oModel.setProperty(sPath + "RobotStatus", statusText);
                oModel.setProperty(sPath + "StatusColor", statusColor);
                oModel.setProperty(sPath + "LastError", data.error || "");
                oModel.refresh(true);
            }
        }
    });
});