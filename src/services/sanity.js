import { createClient } from '@sanity/client';

export const sanityClient  = createClient({
  projectId:   'ukv0c79c',
  dataset:      'production',
  apiVersion:  '2025-05-01',
  useCdn:      process.env.NODE_ENV === 'production',
})
