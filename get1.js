const platformClient = require("purecloud-platform-client-v2");
const { Client } = require("pg");
const config = require("./config.js");

async function getToken() {
  const client = platformClient.ApiClient.instance;
  client.setEnvironment(platformClient.PureCloudRegionHosts.ap_south_1);

  try {
    const clientInstance = await client.loginClientCredentialsGrant(
      config.clientId,
      config.clientSecret
    );
    const GenesysAccessToken = clientInstance.accessToken;
    client.setAccessToken(GenesysAccessToken);
    console.log("GenesysAccessToken =>", GenesysAccessToken);
  } catch (err) {
    console.error("Error generating token:", err);
    return;
  }

  try {
    const dbClient = new Client(config.database);
    await dbClient.connect();

    const ConversationsApi = new platformClient.ConversationsApi();
    const conversationId = "930d9b07-73ed-4695-b705-5877ebc02ae3";

    try {
      const conversationDetails =
        await ConversationsApi.getAnalyticsConversationDetails(conversationId);
      console.log(
        "\n Conversations Details are Printed here:\n",
        "\n ani=>",
        conversationDetails.participants[0].sessions[0].ani,
        "\n Direction=>",
        conversationDetails.originatingDirection,
        "\n dnis=>",
        conversationDetails.participants[0].sessions[0].dnis,
        "\n division=>",
        conversationDetails.divisionIds,
        "\n conversationStart=>",
        conversationDetails.conversationStart,
        "\n conversationEnd",
        conversationDetails.conversationEnd
      );

      let conversationid = conversationDetails.conversationId;
      let startdate = conversationDetails.conversationStart;
      let enddate = conversationDetails.conversationEnd;

      const {
        ani = "",
        direction = "",
        dnis = "",
        divisionIds,
        conversationStart,
        conversationEnd,
        conversationId: conversationId1,
      } = conversationDetails;

      await dbClient.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        conversationid TEXT PRIMARY KEY,
        startdate DATE,
        enddate DATE,
        ani VARCHAR(255),
        dnis VARCHAR(255),
        direction VARCHAR(255),
        divisionid TEXT
    )`);
      const upsertQuery = `
        INSERT INTO conversations (
          conversationId1,
          startDate,
          endDate,
          ani,
          dnis,
          direction,
          divisionId
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (conversationId1) DO UPDATE SET
          startDate = excluded.startDate,
          endDate = excluded.endDate,
          ani = excluded.ani,
          dnis = excluded.dnis,
          direction = excluded.direction,
          divisionId = excluded.divisionId;
      `;

      const values = [
        conversationId1,
        conversationStart,
        conversationEnd,
        ani,
        dnis,
        direction,
        divisionIds,
      ];

      let upserttext = `
                    WITH upsert AS (UPDATE "conversations" SET "startDate"= '${startdate}', "endDate"= '${enddate}' WHERE ("conversationid"='${conversationid}') RETURNING *)
                    INSERT INTO "conversations" ("conversationid", "startDate", "endDate") SELECT '${conversationid}', '${startdate}', '${enddate}' WHERE NOT EXISTS (SELECT * FROM upsert)
                    `;

      await dbClient.query(upsertQuery, values);
      console.log("\n *** Conversation data upserted successfully ***");
    } catch (err) {
      console.error("Error fetching or storing conversation details:", err);
    } finally {
      await dbClient.end();
    }
  } catch (err) {
    console.error("Error connecting to database:", err);
  }
}

getToken();
