const admin=require('firebase-admin');
// // deploy
// admin.initializeApp();

// serve
var serviceAccount = require("../privateKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://socialape1-9509e.firebaseio.com"
});

const db = admin.firestore();

module.exports = { admin , db}