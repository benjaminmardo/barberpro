import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService {
  readonly auth: ReturnType<typeof getAuth>;
  readonly firestore: ReturnType<typeof getFirestore>;

  constructor(config: ConfigService) {
    const projectId = config.getOrThrow<string>('FIREBASE_PROJECT_ID').trim();
    if (!projectId) throw new Error('Define FIREBASE_PROJECT_ID en backend/.env.');

    const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL')?.trim();
    const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY')?.trim();
    const firestoreEmulator = config.get<string>('FIRESTORE_EMULATOR_HOST');
    const authEmulator = config.get<string>('FIREBASE_AUTH_EMULATOR_HOST');
    if (Boolean(firestoreEmulator) !== Boolean(authEmulator)) {
      throw new Error('Configura los emuladores de Authentication y Firestore juntos.');
    }
    if (!firestoreEmulator && Boolean(clientEmail) !== Boolean(privateKey)) {
      throw new Error('FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY deben configurarse juntos.');
    }

    const credential = firestoreEmulator
      ? undefined
      : clientEmail && privateKey
        ? cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') })
        : applicationDefault();

    const app = getApps()[0] ?? initializeApp({ projectId, credential });
    this.auth = getAuth(app);
    this.firestore = getFirestore(app);
  }
}