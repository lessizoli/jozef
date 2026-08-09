import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
setGlobalOptions({ region: 'europe-west1' });

import { sendQuoteWithBuffer } from './quotes/sendQuoteWithBuffer';
import { generateQuotePdf } from './quotes/generateQuotePdf';
import { generateContractPdf } from './contracts/generateContractPdf';
import { sendContractWithBuffer } from './contracts/sendContractWithBuffer';
import { downloadSignedContract } from './contracts/downloadSignedContract';
import { registerTenant } from './auth/registerTenant'; // Ez az importod
import { inviteCompanyMember, updateCompanyMember } from './auth/manageCompanyMembers';
import { createCompanyForCurrentUser, switchActiveCompany } from './auth/companyMemberships';

// Figyelj rá, hogy mind a kettő itt legyen bent az exportban!
export { 
  sendQuoteWithBuffer,
  generateQuotePdf,
  generateContractPdf,
  sendContractWithBuffer,
  downloadSignedContract,
  registerTenant,
  inviteCompanyMember,
  updateCompanyMember,
  createCompanyForCurrentUser,
  switchActiveCompany,
};
