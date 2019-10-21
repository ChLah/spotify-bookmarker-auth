import express from 'express';
import cookieParser from 'cookie-parser';
import * as admin from 'firebase-admin';
import { router as AuthorizeRouter } from '../routes/authorize';
import firebaseAdminCredentials from '../configurations/firebase-admin.json';
import certPaths from '../configurations/cert-paths.json';
import https from 'https';
import fs from 'fs';

export class App {
    private httpsServer: https.Server;
    private express: express.Express;
    private port: number;

    constructor() {
        this.express = express();
        const credentials: https.ServerOptions = { 
            key: fs.readFileSync(certPaths.key), 
            cert:  fs.readFileSync(certPaths.cert), 
        };
        this.httpsServer = https.createServer(credentials, this.express);
        this.port = process.env.port ? parseInt(process.env.port) : 3000;

        this.initializeMiddleware();
        this.initializeMisc();
        this.initializeRouters();
    }

    public run() {
        this.httpsServer.listen(this.port, () => {
            console.log(`Node running and listening on port ${this.port}`)
        });
    }

    private initializeMisc() {
        const serviceAccount = firebaseAdminCredentials as admin.ServiceAccount;
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://spotify-bookmarker.firebaseio.com"
        })
    }

    private initializeMiddleware() {
        this.express.use(cookieParser());
    }

    private initializeRouters() {
        this.express.use('/authorize', AuthorizeRouter);
    }
}