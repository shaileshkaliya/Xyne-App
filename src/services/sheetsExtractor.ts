import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ingestData } from '../rag-utilities/dataIngestion';

export async function fetchGoogleSheetsAsString(
  auth: OAuth2Client,
): Promise<string> {
  const drive = google.drive({ version: 'v3', auth });
  const sheetsAPI = google.sheets({ version: 'v4', auth });

  const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and (modifiedTime > '${oneMonthAgo.toISOString()}')`,
    fields: 'files(id, name, modifiedTime, createdTime)',
  });

  const files = res.data.files || [];
  let finalText = '';
  const ingestionPromises: Promise<void>[] = [];

  for (const file of files) {
    const task = async () => {
      const sheet = await sheetsAPI.spreadsheets.get({
        spreadsheetId: file.id!,
        includeGridData: true,
      });

      const sheetInfo = (sheet.data.sheets || []).map((s) => {
        const rows = s.data?.[0]?.rowData || [];
        const content = rows
          .map((row) =>
            (row.values || [])
              .map((cell) => cell.formattedValue || '')
              .join(' | ')
          )
          .join('\n');

        return `
---- Sheet Start ----
Sheet Title: ${s.properties?.title || 'Untitled'}

${content}
---- Sheet End ----
`;
      }).join('\n');

      const docInfo = `
==== Spreadsheet Start ====
Spreadsheet Title: ${file.name}
Spreadsheet ID: ${file.id}
Created: ${file.createdTime}
Modified: ${file.modifiedTime}

${sheetInfo}
==== Spreadsheet End ====
`;

      const sourceId = `sheet-${file.id}`;
      await ingestData(docInfo, sourceId);

      finalText += docInfo + '\n\n';
    };

    ingestionPromises.push(task());
  }

  await Promise.all(ingestionPromises);

  return finalText.trim();
}
