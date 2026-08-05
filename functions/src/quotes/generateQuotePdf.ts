import { onCall } from 'firebase-functions/v2/https';
import { createQuotePdf } from './quotePdf';
import { getQuoteContext, quoteFilename } from './quoteModel';

export const generateQuotePdf = onCall(async (request) => {
  const context = await getQuoteContext(request.auth?.uid, request.data?.projectId);
  const pdf = await createQuotePdf(context);
  return {
    filename: quoteFilename(context.quote.quoteNumber),
    contentBase64: pdf.toString('base64'),
  };
});
