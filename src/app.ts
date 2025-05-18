import express, {Request, Response} from 'express';
import { getAuthUrl, oauth2Client } from './config/googleAuth';
import dotenv from 'dotenv';
import { fetchGoogleDocsAsString } from './services/docsExtractor';
import { fetchGoogleSheetsAsString } from './services/sheetsExtractor';
import { fetchGoogleCalendarsAsString } from './services/calendarExtractor';
import { answerUserQuery } from './rag-utilities/ragUtilities'

dotenv.config();

const app = express();


async function main() {

  const tasks = [
    fetchGoogleDocsAsString(oauth2Client),
    fetchGoogleSheetsAsString(oauth2Client),
    fetchGoogleCalendarsAsString(oauth2Client),
  ];

  await Promise.all(tasks);

  console.log('✅ All sources fetched and indexed!');
}

app.get('/auth', (req: Request, res: Response) => {
  const url = getAuthUrl();
  res.redirect(url);
});

app.get('/auth/callback', async (req: Request, res: Response): Promise<any> => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("Missing auth code");

    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Send a quick response first
    res.send("✅ Authentication successful! You can close this window.");

    // THEN start background data fetching
    main().catch((err) => {
      console.error('❌ Error:', err);
    });

    console.log("Data stored successfully !");
    
  } catch (err) {
    console.error("❌ Error in /auth/callback:", err);
    res.status(500).send("Authentication failed");
  }
});

app.get('/chat', async (req: Request, res: Response): Promise<any> => {
  try {
    const query = req.body;
    if(query.length === 0){
      return res.status(500).send({error:"No query found !"});
    }
    const response = await answerUserQuery(query);
    return res.status(200).send({response});
    
  } catch (err) {
    console.error("Error in fetching response", err);
    res.status(500).send("Authentication failed");
  }
});


export default app;