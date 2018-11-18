import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();
db.settings({
    databaseAuthVariableOverride: { uid: "server-uid" },
    timestampsInSnapshots: true
});

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const sendEvent = functions.https.onRequest(async (request, response) => {
    if (!request || !request.header("Authorization") || request.header("Authorization") === "") {
        response.status(403).send("Unauthorized");
        return;
    }

    if (!request || !request.body) {
        response.status(400).send("Bad parameters");
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(request.get("Authorization").split('Token ')[1])
        const uid = decodedToken.uid;
        console.log("UID : ", uid);
        const doc = await db.collection('accounts').doc(uid).get();
        if (!doc || !doc.exists) {
            response.status(400).send("User not found");
            return;
        }
        const user = doc.data();
        if (user.FCMToken) {
            const original = request.body;

            if (!original.event) {
                response.status(400).send("Unknown event");
                return;
            }

            if (original.event !== 'Shutdown' && original.event !== 'Startup' && original.event !== 'Disconnected' && original.event !== 'Error' && original.event !== 'PrintStarted' && original.event !== 'PrintFailed' && original.event !== 'PrintDone' && original.event !== 'PrintCancelled') {
                response.send("This event doesn't send notifications");
                return;
            }

            // This registration token comes from the client FCM SDKs.
            const registrationToken = user.FCMToken;

            // Send a message to the device corresponding to the provided
            // registration token.
            admin.messaging().send({
                token: registrationToken,
                notification: {
                    title: "3D printer event",
                    body: original.event
                }
            })
                .then((res) => {
                    // Response is a message ID string.
                    response.send(res);
                    console.log('Successfully sent message:', res);
                })
                .catch((error) => {
                    response.send(error);
                    console.log('Error sending message:', error);
                });
        } else {
            response.status(400).send("User doesn't allow notifications");
        }
    } catch (error) {
        response.status(400).send("User unknown");
        return;
    };
});

export const unregisterFCMToken = functions.https.onRequest(async (request, response) => {
    if (!request || !request.body || !request.body.Id) {
        response.status(400).send("Bad parameters");
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(request.body.Id)
        const uid = decodedToken.uid;
        await db.collection('accounts').doc(uid).set({
            Id: uid
        });
        response.send("OK");
    } catch (error) {
        response.status(400).send("User unknown");
        return;
    };
});

export const registerFCMToken = functions.https.onRequest(async (request, response) => {
    if (!request || !request.body || !request.body.Id || !request.body.FCMToken) {
        response.status(400).send("Bad parameters");
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(request.body.Id)
        const uid = decodedToken.uid;
        await db.collection('accounts').doc(uid).set({
            Id: uid,
            FCMToken: request.body.FCMToken,
        });
        response.send("OK");
    } catch (error) {
        response.status(400).send("User unknown");
        return;
    };
});

export const getProfile = functions.https.onRequest(async (request, response) => {
    if (!request || !request.header("Authorization") || request.header("Authorization") === "") {
        response.status(403).send("Unauthorized");
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(request.get("Authorization").split('Token ')[1])
        const uid = decodedToken.uid;
        const doc = await db.collection('accounts').doc(uid).get();
        if (!doc || !doc.exists) {
            response.status(400).send("User not found");
            return;
        }
        const user = doc.data();
        const profile = { Id: uid, IsNotificationsEnabled: false };
        if (user.FCMToken) {
            profile.IsNotificationsEnabled = true;
        }
        response.send(profile);
    } catch (error) {
        response.status(400).send("User unknown");
        return;
    };
});

export const setProfile = functions.https.onRequest(async (request, response) => {
    if (!request || !request.header("Authorization") || request.header("Authorization") === "") {
        response.status(403).send("Unauthorized");
        return;
    }

    if (!request || !request.body) {
        response.status(400).send("Bad parameters");
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(request.get("Authorization").split('Token ')[1])
        const uid = decodedToken.uid;
        const doc = await db.collection('accounts').doc(uid).get();
        if (!doc || !doc.exists) {
            response.status(400).send("User not found");
            return;
        }
        const user = doc.data();
        const profile = { Id: uid, IsNotificationsEnabled: false };
        if (user.FCMToken) {
            profile.IsNotificationsEnabled = true;
        }
        response.send(profile);
    } catch (error) {
        response.status(400).send("User unknown");
        return;
    };
});

export const registerOctoprintInstance = functions.https.onRequest(async (request, response) => {
    if (!request || !request.header("Authorization") || request.header("Authorization") === "") {
        response.status(403).send("Unauthorized");
        return;
    }

    if (!request || !request.body || !request.body.local_address) {
        response.status(400).send("Bad parameters");
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(request.get("Authorization").split('Token ')[1])
        const uid = decodedToken.uid;
        const doc = await db.collection('accounts').doc(uid).get();
        if (!doc || !doc.exists) {
            response.status(400).send("User not found");
            return;
        }
        const user = doc.data();
        if (!user.instances) {
            user.instances = [];
        }
        let isInstanceExists = false;
        for (const instance of user.instances) {
            if (instance && instance === request.body.local_address) {
                isInstanceExists = true;
                break;
            }
        }
        if (!isInstanceExists) {
            user.instances.push(request.body.local_address);
            await db.collection('accounts').doc(uid).set(user);
        }
        response.send("OK");
    } catch (error) {
        response.status(400).send("User unknown");
        return;
    };
});