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

let connector = new ChatConnector({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

let bot = new UniversalBot(connector, (session) => {
	session.replaceDialog('root', { isFirst: true });
});

bot.dialog('root', [
	(session, args) => {
		let msg = new Message(session)
			.textFormat('plain');
		if (args && args.isFirst)
			msg.text('سلام...\nپیام بده');
		else
			msg.text('پیام بده');
		// session.send({args});
		session.sendTyping();
		// Prompts.attachment(session, msg);
		Prompts.PostPrompt(session, msg);
	},(session, results) => {
		session.sendTyping();
		db.insert('pendingMessages', { message: results }, () => {
			session.send('ببینم جی میشه...');
			Prompts.choice(session, 'باز میخوای بفرستی؟', ['آره!', 'نه!'], { listStyle: 3, retryPrompt: 'والا نفهمیدم چی میگی... میخوای باز پست بدی؟' });
		});
	},
	(session, results) => {
		if (results.response.entity === 'آره!')
			session.replaceDialog('root', { isFirst: false })
		else
			session.endConversation('پس به سلامت...');
	}
]);

let _postPrompt = new builder.Prompt({ defaultRetryPrompt: 'والا نفهمیدم چی میگی... میخوای باز پست بدی؟' })
	.onRecognize((context, callback) => {
		callback(null, 1.0, context.message);
	});
bot.dialog('PostPrompt', _postPrompt);
builder.Prompts.PostPrompt = (session, prompt, options) => {
	let args = options || {};
	args.prompt = prompt || options.prompt;
	session.beginDialog('PostPrompt', args);
}
