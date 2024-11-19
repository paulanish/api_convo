const platformClient = require("purecloud-platform-client-v2");
const { Client } = require('pg');
const config = require("./config.js")

async function getToken() {
  const client = platformClient.ApiClient.instance;
  client.setEnvironment(platformClient.PureCloudRegionHosts.ap_south_1);

  // Token Generation Code
  try {
    const clientId = 'c3129afe-43af-4b5e-818f-7e5c0fdbbb6e';
    const clientSecret = 'F9xPK0fdjTYn0btfHazbVw8rd5GGLwkBpU5BcMgVRZg';
    const clientInstance = await client.loginClientCredentialsGrant(clientId, clientSecret);
    const GenesysAccessToken = clientInstance.accessToken;
    client.setAccessToken(GenesysAccessToken);
    console.log('GenesysAccessToken =>', GenesysAccessToken);
  } catch (err) {
    console.error("Error generating token:", err);
    return;
  }

  try {
    const dbClient = new Client(config.database);
    await dbClient.connect();

    const ConversationsApi = new platformClient.ConversationsApi();
    const conversationId = '930d9b07-73ed-4695-b705-5877ebc02ae3';

    try {
      const conversationDetails = await ConversationsApi.getAnalyticsConversationDetails(conversationId);
      console.log('Comment =>', conversationDetails.participants[0].sessions[0].ani, conversationDetails.originatingDirection, conversationDetails.participants[0].sessions[0].dnis, conversationDetails.divisionIds, conversationDetails.conversationStart, conversationDetails.conversationEnd );

      let ani = conversationDetails.participants[0].sessions[0].ani;
      let direction = conversationDetails.originatingDirection;
      let dnis =  conversationDetails.participants[0].sessions[0].dnis;
      let conversationStart = conversationDetails.conversationStart;
      let conversationEnd =conversationDetails.conversationEnd;
      let division =   conversationDetails.divisionIds;
      let conversationId1 = conversationDetails.conversationId;
      
   
      await dbClient.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          conversationId1 TEXT ,
          startDate DATE,
          endDate DATE,
          ani VARCHAR(255),
          dnis VARCHAR(255),
          direction VARCHAR(255),
          divisionId TEXT
        )
      `);

      const insertQuery = `
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
    `;
    
    const values = [
      conversationId1, // conversationId
      conversationStart, // startDate
      conversationEnd, // endDate
      ani, // ani
      dnis, // dnis
      direction, // direction
      division // divisionId
    ];
    
    await dbClient.query(insertQuery, values);
    console.log('*** Table Created and inserted sucessfully***');

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
