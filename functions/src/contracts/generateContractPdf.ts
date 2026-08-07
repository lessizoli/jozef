import { onCall } from 'firebase-functions/v2/https';
import { getContractContext, contractFilename } from './contractModel';
import { createContractPdf } from './contractPdf';

export const generateContractPdf = onCall(async (request) => {
  const context = await getContractContext(request.auth?.uid, request.data?.projectId);
  const pdf = await createContractPdf(context);
  return {
    filename: contractFilename(context.contract.contractNumber),
    contentBase64: pdf.toString('base64'),
  };
});
