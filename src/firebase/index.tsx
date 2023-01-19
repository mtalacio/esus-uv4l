import { initializeApp } from "firebase/app";
import { collection, getFirestore, limit, onSnapshot, orderBy, query, Unsubscribe } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAhhe0Rx3j6_YN5wHJsJ84LZ_TPc59wuq0",
    authDomain: "esus-d4f3d.firebaseapp.com",
    databaseURL: "https://esus-d4f3d.firebaseio.com",
    projectId: "esus-d4f3d",
    storageBucket: "esus-d4f3d.appspot.com",
    messagingSenderId: "732924361274",
    appId: "1:732924361274:web:dae407ad1f24f342c35303",
    measurementId: "G-GZ1NSGX9C5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export type Location = {
    lat: number,
    lng: number
}

export const attachMapListener = (companyId: string, vehicleId: string, callback: (loc: Location) => void): Unsubscribe => {
    console.log(`Adding Listener to ${companyId}::${vehicleId}`)
    const ref = collection(db, `companies/${companyId}/vehicles/${vehicleId}/location`);

    const unsub = onSnapshot(query(ref, orderBy("date", "desc"), limit(1)), (doc) => {
        doc.docChanges().forEach(change => {
            if(change.type !== "added")
                return;
            
            const data = change.doc.data();

            callback({
                lat: data.gps._lat,
                lng: data.gps._long
            })
        })
    }, error => {
        console.log(error);
    });

    return unsub;
}
