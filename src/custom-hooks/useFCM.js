// src/useFCM.js

import { useEffect } from 'react';
import { messagingReady, functions } from '../firebase.config';
import { getToken, onMessage } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';

export function useFCM() {
  useEffect(() => {
    (async () => {
      // 1️⃣ Wait for messaging support
      const messaging = await messagingReady;
      if (!messaging) {
        console.log('FCM not supported in this environment.');
        return;
      }

      // 2️⃣ Register the FCM service worker
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('FCM Service Worker registered at', registration.scope);
      } catch (swErr) {
        console.warn('FCM SW registration failed:', swErr);
        return;
      }

      // 3️⃣ Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted.');
        return;
      }

      // 4️⃣ Get the current FCM token
      const vapidKey = import.meta.env.VITE_VAPID_KEY;
      let currentToken;
      try {
        currentToken = await getToken(messaging, { vapidKey });
      } catch (tokenErr) {
        console.error('Error retrieving FCM token:', tokenErr);
        return;
      }

      if (!currentToken) {
        console.error('No FCM token retrieved.');
        return;
      }
      console.log('FCM token:', currentToken);

      // 5️⃣ Save the token to your backend via Cloud Function
      try {
        const saveToken = httpsCallable(functions, 'saveFcmToken');
        await saveToken({ token: currentToken });
        console.log('FCM token saved via Cloud Function.');
      } catch (saveErr) {
        console.error('Error saving FCM token:', saveErr);
      }

      // 6️⃣ (Optional) Listen for foreground messages
      onMessage(messaging, payload => {
        console.log('Foreground FCM message:', payload);
        // e.g. display a toast or in-app notification
      });
    })();
  }, []);
}
