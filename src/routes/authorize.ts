import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { AuthorizeController } from '../controllers/authorize';

const router = Router();
const controller = new AuthorizeController();

router.get('/redirect', (req: Request, res: Response) => {
    const state = req.cookies.state || crypto.randomBytes(20).toString('hex');
    const authUrl = controller.getAuthUrl(state);

    res.cookie('state', state, { maxAge: 3600000 });
    res.redirect(authUrl);
});

router.get('/token', async (req: Request, res: Response) => {
    const { state, code } = req.query;
    const { state: stateCookie } = req.cookies;

    console.log('Received token request states', { state, stateCookie})

    if (!stateCookie) {
        console.error('No state cookie was set');
        res.status(401).send('State cookie not set or expired');
        return;
    }

    if (state !== stateCookie) {
        console.error('State validation failed');
        res.status(401).send('State validation failed');
        return;
    }

    if (!code) {
        console.error('No code provided in callback');
        res.status(401).send('No code provided in callback');
        return;
    }

    const token = await controller.getToken(code);
    res.jsonp({token: token});
});

export { router };