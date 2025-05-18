import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ingestData } from '../rag-utilities/ragUtilities';

export async function fetchGoogleDocsAsString(
  auth: OAuth2Client,
): Promise<string> {
  const drive = google.drive({ version: 'v3', auth });
  const docsAPI = google.docs({ version: 'v1', auth });
  

  const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.document' and (modifiedTime > '${oneMonthAgo.toISOString()}')`,
    fields:
      'files(id, name, createdTime, modifiedTime, owners, lastModifyingUser, permissions, webViewLink, mimeType, sharedWithMeTime)',
  });

  const files = res.data.files || [];
  let finalText = '';


  const ingestionPromises: Promise<void>[] = [];

  for (const file of files) {
    const doc = await docsAPI.documents.get({ documentId: file.id! });
    const text =
      doc.data.body?.content
        ?.map(
          (item) =>
            item.paragraph?.elements
              ?.map((el) => el.textRun?.content)
              .join('') || '',
        )
        .join('') || '';

    const docInfo = `
==== Document Start ====
Title: ${file.name}
Created: ${file.createdTime}
Modified: ${file.modifiedTime}
Owners: ${(file.owners || []).map((o) => o.displayName).join(', ')}
Last Modified By: ${file.lastModifyingUser?.displayName || 'N/A'}
View Link: ${file.webViewLink}
Shared With Me Time: ${file.sharedWithMeTime || 'N/A'}

Content:
${text}

==== Document End ====
`;

    // Create a unique ID using file.id
    const sourceId = `doc-${file.id}`;
    ingestionPromises.push(ingestData(docInfo, sourceId));

    finalText += docInfo + '\n\n';
    break;
  }

  await Promise.all(ingestionPromises);

  return finalText.trim();
}
