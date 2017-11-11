require('dotenv-extended').load();

const builder = require('botbuilder');
const restify = require('restify');
const { Prompts, UniversalBot, ChatConnector, Message } = builder;
const Mongo = require('./MongoInterface');

let db = new Mongo();

const server = restify.createServer();
server.listen(process.env.PORT, () => {
	console.log(`${server.name} listening to ${server.url}`);
});

let connector  = new ChatConnector({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

let bot = new UniversalBot(connector, (session) => {
	session.replaceDialog('root', {isFirst: true});
});

bot.dialog('root', [
	(session, args) => {
		let msg = new Message(session)
			.textFormat('plain');
		if(args && args.isFirst)
			msg.text('سلام...\nپیام بده');
		else
			msg.text('پیام بده');
		// session.send({args});
		session.sendTyping();
		Prompts.text(session, msg);
	},
	(session, results) => {
		session.sendTyping();
		db.insert('pendingMessages', {message: results}, () => {
			session.send('ببینم جی میشه...');
			Prompts.choice(session, 'باز میخوای بفرستی؟', ['آره!'], {listStyle: 3});
		});
	},
	(session, results) => {
		if(results.response.entity === 'آره!')
			session.replaceDialog('root', {isFirst: false})
		else
			session.replaceDialog('requester');
	}
]);

bot.dialog('requester', [
	(session) => {
		let msg = new Message(session)
			.textFormat('plain')
			.text('والا نفهمیدم چی میگی...');
		session.send(msg);
		Prompts.choice(session, 'اگه خواستی بفرستی بگو!!!!!', ['میخوام!'], {listStyle: 3});
	},
	(session, results) => {
		if(results.response.entity === 'میخوام!')
			session.replaceDialog('root', {isFirst: false});
		else
			session.replaceDialog('requester');
	}
]);