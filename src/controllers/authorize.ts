import SpotifyWebApi from "spotify-web-api-node";
import spotifyConfig from '../configurations/spotify.json';
import * as admin from 'firebase-admin';

export class AuthorizeController {
    private spotifyApi: SpotifyWebApi;

    constructor() {
        this.spotifyApi = new SpotifyWebApi({
            ...spotifyConfig, 
            //redirectUri: `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/authcallback`
            // For testing purposes:
            redirectUri: 'http://localhost:4200/authcallback'
        });
    }

    public getAuthUrl(state: string): string {
        return this.spotifyApi.createAuthorizeURL(spotifyConfig.scopes, state);
    }

    public async getToken(code: string): Promise<string> {
        const retData = await this.spotifyApi.authorizationCodeGrant(code);
        const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = retData.body;

        this.spotifyApi.setAccessToken(accessToken);
        this.spotifyApi.setRefreshToken(refreshToken);

        const userData = await this.spotifyApi.getMe();
        
        const token = await this.createFirebaseAccount(
            userData.body, accessToken, refreshToken, expiresIn
        );

        return token;
    }

    private async createFirebaseAccount(
        userProfile: SpotifyApi.CurrentUsersProfileResponse, 
        accessToken: string, 
        refreshToken: string,
        expiresIn: number
    ): Promise<string> {
        const uid = `spotify:${userProfile.id}`;

        const expires = new Date();
        expires.setSeconds(expires.getSeconds() + expiresIn);

        await admin.firestore().collection('/spotifyAccessToken').doc(uid).set({
            accessToken, 
            refreshToken,
            expires
        });

        const userRequest: admin.auth.UpdateRequest = {
            displayName: userProfile.display_name,
            email: userProfile.email,
            photoURL: userProfile.images ? userProfile.images[0].url : undefined
        };

        try {
            await admin.auth().createUser({ uid, ...userRequest });
        } catch (err) {
            if (err.code === 'auth/uid-already-exists') {
                await admin.auth().updateUser(uid, userRequest);
            } else {
                console.log('Unexpected error occured', err);
            }
        }

        const token = await admin.auth().createCustomToken(uid);
        
        return token;
    }
}