import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ingestData } from '../rag-utilities/ragUtilities';

export async function fetchGoogleCalendarsAsString(
  auth: OAuth2Client,
): Promise<string> {
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.calendarList.list();

  const items = res.data.items || [];
  const ingestionPromises: Promise<void>[] = [];
  let finalText = '';

  for (const cal of items) {
    const task = async () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const eventsRes = await calendar.events.list({
        calendarId: cal.id!,
        timeMin: oneMonthAgo.toISOString(),
        maxResults: 2500,
        singleEvents: true,
      });

      const events = eventsRes.data.items || [];

      const eventsText = events.map((e, index) => {
        return `
--- Event ${index + 1} ---
Title: ${e.summary || ''}
Description: ${e.description || ''}
Location: ${e.location || ''}
Start: ${e.start?.dateTime || e.start?.date || ''}
End: ${e.end?.dateTime || e.end?.date || ''}
Attendees: ${(e.attendees || []).map((a) => a.email).join(', ')}
Organizer: ${e.organizer?.email || ''}
Creator: ${e.creator?.email || ''}
Event Type: ${e.eventType || ''}
Hangout Link: ${e.hangoutLink || ''}
--- End of Event ---
`.trim();
      }).join('\n\n');

      const calendarInfo = `
==== Calendar Start ====
Calendar Name: ${cal.summary}
Calendar ID: ${cal.id}
Description: ${cal.description || 'N/A'}
Time Zone: ${cal.timeZone || 'N/A'}

${eventsText}

==== Calendar End ====
`;

      const sourceId = `calendar-${cal.id}`;
      await ingestData(calendarInfo, sourceId);
      finalText += calendarInfo + '\n\n';
    };

    ingestionPromises.push(task());
  }
  await Promise.all(ingestionPromises);

  return finalText.trim();
}
