import express, {Request, Response} from 'express';
import { getAuthUrl, oauth2Client } from './config/googleAuth';
import dotenv from 'dotenv';
import { fetchGoogleDocsAsString } from './services/docsExtractor';
import { fetchGoogleSheetsAsString } from './services/sheetsExtractor';
import { fetchGoogleCalendarsAsString } from './services/calendarExtractor';
import { answerFromQuery } from './rag-utilities/ragUtilities';
import path from 'path';
import { AUTH_ENDPOINT, CHAT_ENDPOINT, OAUTH_CALLBACK_ENDPOINT } from './utils/constants';

dotenv.config();

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});



async function main() {

  const tasks = [
    fetchGoogleDocsAsString(oauth2Client),
    fetchGoogleSheetsAsString(oauth2Client),
    fetchGoogleCalendarsAsString(oauth2Client),
  ];

  await Promise.all(tasks);

  console.log('✅ All sources fetched and indexed!');
}

app.get(AUTH_ENDPOINT, (req: Request, res: Response) => {
  const url = getAuthUrl();
  res.redirect(url);
});

app.get(OAUTH_CALLBACK_ENDPOINT, async (req: Request, res: Response): Promise<any> => {
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

app.post(CHAT_ENDPOINT, async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(req);
    const { query } = req.body;
    if(query.length === 0){
      return res.status(500).send({error:"No query found !"});
    }
    const response = await answerFromQuery(query);
    return res.status(200).send({response});
    
  } catch (err) {
    console.error("Error in fetching response", err);
    res.status(500).send("Error occured : "+err);
  }
});

export default app;
