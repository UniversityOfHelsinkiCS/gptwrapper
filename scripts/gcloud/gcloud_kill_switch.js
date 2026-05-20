// used inside gcloud project shutdown, read documentation of how to redeploy
const { google } = require("googleapis");

exports.killSwitch = async (event, context) => {
  const data = JSON.parse(Buffer.from(event.data, "base64").toString());
  const cost = data.costAmount || 0;
  const budget = data.budgetAmount || 0;

  if (cost <= budget) {
    console.log("Budget not exceeded.");
    return;
  }

  const projectId = process.env.PROJECT_ID;

  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
  });

  const billing = google.cloudbilling({
    version: "v1",
    auth
  });

  await billing.projects.updateBillingInfo({
    name: `projects/${projectId}`,
    requestBody: {
      billingAccountName: ""
    }
  });

  console.log("Billing disabled. Project shut down.");
};
