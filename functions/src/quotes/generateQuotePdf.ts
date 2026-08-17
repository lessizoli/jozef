import { onCall } from 'firebase-functions/v2/https';
import { createQuotePdf } from './quotePdf';
import { getQuoteContext, quoteFilename } from './quoteModel';
import { assertValidSession } from '../auth/exclusiveSession';

export const generateQuotePdf = onCall(async (request) => {
  await assertValidSession(request.auth?.uid, request.auth?.token);
  const context = await getQuoteContext(request.auth?.uid, request.data?.projectId);
  const pdf = await createQuotePdf(context);
  return {
    filename: quoteFilename(context.quote.quoteNumber),
    contentBase64: pdf.toString('base64'),
  };
});
