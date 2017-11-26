require('dotenv-extended').load();

const builder = require('botbuilder');
const restify = require('restify');
const { Prompts, UniversalBot, ChatConnector, Message } = builder;
const Mongo = require('./MongoInterface');
const fs = require('fs');
const https = require('https');

let db = new Mongo();

const httpsKey = fs.readFileSync('./encryption/PostReceiverBot.key');
const httpsCert = fs.readFileSync('./encryption/PostReceiverBot.crt');

let httpsOptions = {
	key: httpsKey,
	cert: httpsCert
}

const server = restify.createServer();
server.listen(process.env.PORT, () => {
	console.log(`${server.name} listening to ${server.url}`);
});

let connector = new ChatConnector({
	appId: process.env.MICROSOFT_APP_ID,
	appPassword: process.env.MICROSOFT_APP_PASSWORD
});

let httpsServer = https.createServer(httpsOptions, connector.listen()).listen(process.env.HTTPS_PORT);

server.post('/api/messages', connector.listen());

let count = 0;

let bot = new UniversalBot(connector, (session) => {
	session.replaceDialog('root', { isFirst: true });
});

bot.dialog('root', [
	(session, args) => {
		let msg = new Message(session)
			.textFormat('plain')
			.suggestedActions(
				builder.SuggestedActions.create(
					session,
					[],
					'User'
				)
			);
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
			else
				item.name = ' ';
		});
		// session.send({results});
		// db.insert('pendingMessages', results.response);
		let cm = {
			text: results.response.text,
			textFormat: 'plain',
			attachments: results.response.attachments
		};
		session.dialogData.sender = results.response.sourceEvent.message.from;
		session.dialogData.cm = cm;
		let msg = {
			text: cm.text,
			attachments: cm.attachments,
			textFormat: 'plain'
		}
		session.send(msg);
		msg = new Message(session)
			.text('مطمئنی؟؟')
			.suggestedActions(
				builder.SuggestedActions.create(
					session, [
						builder.CardAction.postBack(session, 'آره، مطمئنم', 'آره، مطمئنم'),
						builder.CardAction.postBack(session, 'نه!!!', 'نه!!!')
					],
					'User'
				)
			);
		let reMsg = new Message(session)
		.text('درست بگو ببینم چی میگی... نفهمیدم')
		.suggestedActions(
			builder.SuggestedActions.create(
				session, [
					builder.CardAction.postBack(session, 'آره، مطمئنم', 'آره، مطمئنم'),
					builder.CardAction.postBack(session, 'نه!!!', 'نه!!!')
				],
				'User'
			)
		);
		Prompts.choice(session, msg, ['آره، مطمئنم', 'نه!!!'], { listStyle: 3, retryPrompt: reMsg });
		// session.send(msg);
	},
	(session, results) => {
		session.sendTyping();
		let msg = new Message(session)
		.text('باز میخوای بفرستی؟')
		.suggestedActions(
			builder.SuggestedActions.create(
				session, [
					builder.CardAction.postBack(session, 'آره!', 'آره!'),
					builder.CardAction.postBack(session, 'نه!', 'نه!')
				],
				'User'
			)
		);
		let reMsg = new Message(session)
		.text('والا نفهمیدم چی میگی... میخوای باز پست بدی؟')
		.suggestedActions(
			builder.SuggestedActions.create(
				session, [
					builder.CardAction.postBack(session, 'آره!', 'آره!'),
					builder.CardAction.postBack(session, 'نه!', 'نه!')
				],
				'User'
			)
		);
		if (results.response.entity === 'آره، مطمئنم')
			db.insert(
				'userMessages',
				{
					message: {
						text: session.dialogData.cm.text,
						attachments: session.dialogData.cm.attachments,
						textFormat: 'plain'
					},
					sender: session.dialogData.sender,
					msgId: count
				},
				() => {
					count++;
					session.dialogData.cm = {};
					session.dialogData.sender = {};
					session.send('ببینم چی میشه...');
					Prompts.choice(session, msg, ['آره!', 'نه!'], { listStyle: 3, retryPrompt: reMsg });
				}
			);
		else {
			
			Prompts.choice(session, msg, ['آره!', 'نه!'], { listStyle: 3, retryPrompt: reMsg });
		}
	},
	(session, results) => {
		if (results.response.entity === 'آره!')
			session.replaceDialog('root', { isFirst: false })
		else {
			let msg = new Message(session)
				.text('پس به سلامت...')
				.suggestedActions(
					builder.SuggestedActions.create(
						session,
						[],
						'User'
					)
				);
			session.endConversation(msg);
		}
	}
])
	.triggerAction({
		matches: /^(\/start)|(\/restart)$/i,
		onSelectAction: (session) => {
			session.endConversation();
			session.replaceDialog('root', { isFirst: true });
		}
	});

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
