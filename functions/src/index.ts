import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
setGlobalOptions({ region: 'europe-west1' });

import { sendQuoteWithBuffer } from './quotes/sendQuoteWithBuffer';
import { registerTenant } from './auth/registerTenant'; // Ez az importod

// Figyelj rá, hogy mind a kettő itt legyen bent az exportban!
export { 
  sendQuoteWithBuffer,
  registerTenant 
};