import { connect } from 'http2';

require('dotenv-extended').load();

const builder = require('botbuilder');
const restify = require('restify');
const { Prompts, UniversalBot, ChatConnector, Message } = builder;

const server = restify.createServer();
server.listen(process.env.PORT, () => {
	console.log(`${server.name} listening to ${server.url}`);
});

let connector  = new ChatConnector({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

let bot = new UniversalBot(connector, [
	// bot code goes here...
]);