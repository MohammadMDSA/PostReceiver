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
	},
	(session, results) => {
		results.response.attachments.forEach((item) => {
			if (!item.name)
				item.name = ' ';
			if (results.response.sourceEvent && results.response.sourceEvent.message && results.response.sourceEvent.message.caption)
				item.name = results.response.sourceEvent.message.caption;
		});
		// session.send({results});
		// db.insert('pendingMessages', results.response);
		let cm = {
			text: results.response.text,
			attachments: results.response.attachments
		};
		session.dialogData.sender = results.response.sourceEvent.message.from;
		session.dialogData.cm = cm;
		let msg = {
			text: cm.text,
			attachments: cm.attachments
		}
		session.send(msg);
		Prompts.choice(session, 'مطمئنی؟؟', ['آره، مطمئنم', 'نه!!!'], { listStyle: 3, retryPrompt: 'درست بگو ببینم چی میگی... نفهمیدم' });
		// session.send(msg);
	},
	(session, results) => {
		session.sendTyping();
		session.send({ results });
		if (results.response.entity === 'آره، مطمئنم')
			db.insert(
				'pendingMessages',
				{
					message: {
						text: session.dialogData.cm.text,
						attachments: session.dialogData.cm.attachments
					},
					sender: session.dialogData.sender
				},
				() => {
					session.dialogData.cm = {};
					session.dialogData.sender = {};
					session.send('ببینم جی میشه...');
					Prompts.choice(session, 'باز میخوای بفرستی؟', ['آره!', 'نه!'], { listStyle: 3, retryPrompt: 'والا نفهمیدم چی میگی... میخوای باز پست بدی؟' });
				}
			);
		else
			Prompts.choice(session, 'باز میخوای بفرستی؟', ['آره!', 'نه!'], { listStyle: 3, retryPrompt: 'والا نفهمیدم چی میگی... میخوای باز پست بدی؟' });
	},
	(session, results) => {
		if (results.response.entity === 'آره!')
			session.replaceDialog('root', { isFirst: false })
		else
			session.endConversation('پس به سلامت...');
	}
]);

// Custom prompt
let _postPrompt = new builder.Prompt({ defaultRetryPrompt: 'والا نفهمیدم چی میگی... میخوای باز پست بدی؟' })
	.onRecognize((context, callback) => {
		callback(null, 1.0, context.message);
	});

// Registering custom prompt dialog
bot.dialog('PostPrompt', _postPrompt);

// Registering custom prompt
builder.Prompts.PostPrompt = (session, prompt, options) => {
	let args = options || {};
	args.prompt = prompt || options.prompt;
	session.beginDialog('PostPrompt', args);
}

bot.dialog('end', (session) => {
	session.endConversation('The end');
})
	.triggerAction({
		matches: /^end$/i
	});