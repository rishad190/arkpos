require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://placeholder.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "placeholder",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function migrate() {
    const collections = ['transactions', 'dailyCashIncome', 'dailyCashExpense'];
    const updates = {};
    let totalUpdated = 0;

    for (const collection of collections) {
        console.log(`Scanning collection: ${collection}`);
        const collRef = ref(db, collection);
        const snapshot = await get(collRef);

        if (!snapshot.exists()) {
            console.log(`No records found in ${collection}.`);
            continue;
        }

        let updatedInCollection = 0;

        snapshot.forEach((child) => {
            const t = child.val();
            const id = child.key;

            // Check if it's a transfer missing transferType
            if (t && t.type === 'transfer' && !t.transferType) {
                let inferredType = null;

                if (t.isTransferIn || t.cashIn > 0) {
                    inferredType = 'withdraw';
                } else if (t.isTransferOut || t.cashOut > 0) {
                    inferredType = 'deposit';
                }

                if (inferredType) {
                    updates[`${collection}/${id}/transferType`] = inferredType;
                    updatedInCollection++;
                } else {
                    console.warn(`Ambiguous transfer missing transferType: ${id} in ${collection}`);
                }
            }
        });

        console.log(`Found ${updatedInCollection} records to update in ${collection}.`);
        totalUpdated += updatedInCollection;
    }

    if (totalUpdated > 0) {
        console.log(`Applying ${totalUpdated} updates...`);
        try {
            await update(ref(db), updates);
            console.log('Migration completed successfully.');
        } catch (error) {
            console.error('Migration failed:', error);
        }
    } else {
        console.log('No legacy transfers needed migration.');
    }

    // Explicitly exit process
    process.exit(0);
}

migrate();
