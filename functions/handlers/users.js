
const firebase = require('firebase');
const {  admin,db } = require('../util/admin');

const config = require('../util/config');


firebase.initializeApp(config);
const { validateSignUpData , validateLoginData, reduceUserDetails } = require('../util/validators');


//sign users up

exports.signup = (req,res) => {

    const newUser = {email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle};


const {valid, errors} = validateSignUpData(newUser);

if(!valid) return res.status(400).json(errors);

 
 
// Validate data
let token, userId;

db.doc(`/users/${newUser.handle}`).get()
.then(doc => {
    if(doc.exists){
        return res.status(400).json({ handle: 'this handle is already taken'});
     }  else {

        return firebase.auth().createUserWithEmailAndPassword(newUser.email,newUser.password);
     }


})
.then(data => {
    userId = data.user.uid;
    console.log('Data Information - ' + data);
    return data.user.getIdToken();
})
 .then(idtoken => {
     token = idtoken;
     const userCredentials = {
             handle: newUser.handle,
             email: newUser.email,
             createdAt: new Date().toISOString(),
             userId: userId

     };
     
     return db.doc(`/users/${newUser.handle}`).set(userCredentials);

 })
 .then((data)  => {

    return res.status(201).json({token});
 })



.catch((err) => {
    //console.error(err);

    if(err.code === 'auth/email-already-in-use') {
        return res.status(400).json({email: 'Email is already in use'});
    } else {
        return res.status(500).json({error: err.code});
    }


});

}

//log user in
exports.login = (req,res) => {

    const user = {
         email: req.body.email,
         password: req.body.password
    };

    const {valid, errors} = validateLoginData(user);

    if(!valid) return res.status(400).json(errors);


    

     firebase.auth().signInWithEmailAndPassword(user.email,user.password)
     .then((data) => {
         return data.user.getIdToken();
     })
     .then((token) => {
          
        return res.json({token});

     })
     .catch((err) => {
         console.error(err);
         return res.status(500).json({error: err.code});
     })

}

//Add user details
exports.addUserdetails =(req,res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() =>{
        return res.json({messege: 'details added successfully' });
     })
     .catch((err) =>{
         console.error(err);
         return res.status(500).json({error: err.code});
     });
};

//upload a profile pic for user
exports.uploadImage = (req,res) =>{
         const BusBoy = require('busboy');
         const path = require('path');
         const os = require('os');
         const fs = require('fs');
    
         const busboy = new BusBoy({headers:req.headers});
        let imageFileName;
        let imageToBeUploaded = {};
         busboy.on('file', (fieldname, file, filename, encoding, mimetype) =>{
             if(mimetype !=='image/jpeg' && mimetype !=='image/png'){
                 return res.status(400).json({error:'wrong file type submitted'});
             }

             //my.image.png
         const imageExtension = filename.split('.')[filename.split('.').length-1]     
         imageFileName = `${Math.round(Math.random()*1000000000000)}.${imageExtension}`;
         const filepath = path.join(os.tmpdir(), imageFileName);
         imageToBeUploaded = {filepath, mimetype};
         file.pipe(fs.createWriteStream(filepath))
        });
        busboy.on('finish', () =>{
            admin.storage().bucket().upload(imageToBeUploaded.filepath, {
                resumable: false,
                matadata:{
                    metadata: {
                        contentType : imageToBeUploaded.mimetype
                    }
                }
    
            })
            .then(() =>{
                console.log("Trying to upload")
                const imageurl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
                return db.doc(`/users/${req.user.handle}`).update({imageurl});
            })
            .then(() =>{
                return res.json({messege:'image uploaded succesfully'});
            })
            .catch(err =>{
                console.error("error is",err);
                return res.status(500).json({error:err.code});
            })
        })
        busboy.end(req.rawBody);
     };