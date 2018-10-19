const Discord = require('discord.js');
const { Client, Util } = require('discord.js');
const client = new Discord.Client();
const { TOKEN ,PREFIX, GOOGLE_API_KEY } = require('./config1');
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');


const youtube = new YouTube(GOOGLE_API_KEY);

const queue = new Map();

client.on('ready', () => {
    console.log('I am ready!');
});

client.on('warn', console.warn);

client.on('error', console.error);

client.on('ready', () => console.log('Yo this ready!'));

// client.on('disconnect', () => console.log('I just disconnected, making sure you know, I will reconnect now...'));

// client.on('reconnecting', () => console.log('I am reconnecting now!'));

client.on('message', async msg => { // eslint-disable-line
	if (msg.author.bot) return undefined;
	if (!msg.content.startsWith(PREFIX)) return undefined;

	const args = msg.content.split(' ');
	const searchString = args.slice(1).join(' ');
	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = queue.get(msg.guild.id);

	let command = msg.content.toLowerCase().split(" ")[0];
	command = command.slice(PREFIX.length)

	if (command === `play`) {
		const voiceChannel = msg.member.voiceChannel;
		if (!voiceChannel) return msg.channel.send('ÃäÇ ÂÓÝ æáßä Úáíß Ãä Êßæä Ýí ÞäÇÉ ÕæÊíÉ áÊÔÛíá ÇáãæÓíÞì!');
		const permissions = voiceChannel.permissionsFor(msg.client.user);
		if (!permissions.has('CONNECT')) {
			return msg.channel.send('áÇ ÃÓÊØíÚ Ãä ÃÊßáã Ýí åÐå ÇáÞäÇÉ ÇáÕæÊíÉ¡ ÊÃßÏ ãä Ãä áÏí ÇáÕáÇÍíÇÊ ÇáÇÒãÉ !');
		}
		if (!permissions.has('SPEAK')) {
			return msg.channel.send('áÇ ÃÓÊØíÚ Ãä ÃÊßáã Ýí åÐå ÇáÞäÇÉ ÇáÕæÊíÉ¡ ÊÃßÏ ãä Ãä áÏí ÇáÕáÇÍíÇÊ ÇáÇÒãÉ !');
		}
		if (!permissions.has('EMBED_LINKS')) {
			return msg.channel.sendMessage("**áÇ íæÌÏ áÏí ÕáÇÍíÇÊ `EMBED LINKS`**")
		}

		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
			const playlist = await youtube.getPlaylist(url);
			const videos = await playlist.getVideos();
			for (const video of Object.values(videos)) {
				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
			}
			return msg.channel.send(` **${playlist.title}** Êã ÇÖÇÝÉ ÇáÞÇÆãå!`);
		} else {
			try {
				var video = await youtube.getVideo(url);
			} catch (error) {
				try {
					var videos = await youtube.searchVideos(searchString, 5);
					let index = 0;
					const embed1 = new Discord.RichEmbed()
			        .setDescription(`**ÇÎÊÇÑ ÑÞã ÇáãÞØÚ** :
${videos.map(video2 => `[**${++index} **] \`${video2.title}\``).join('\n')}`)
					.setFooter("")
					msg.channel.sendEmbed(embed1).then(message =>{message.delete(20000)})
					
					// eslint-disable-next-line max-depth
					try {
						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
							maxMatches: 1,
							time: 10000,
							errors: ['time']
						});
					} catch (err) {
						console.error(err);
						return msg.channel.send('áã íÊã ÊÍÏíÏ ÇáÚÏÏ áÊÔÛíá ÇáÇÛäíå.');
					}
					const videoIndex = parseInt(response.first().content);
					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
				} catch (err) {
					console.error(err);
					return msg.channel.send(':X: áã ÃÓÊØÚ ÇáÍÕæá Úáì ÃíÉ äÊÇÆÌ ÈÍË.');
				}
			}
			return handleVideo(video, msg, voiceChannel);
		}
	} else if (command === `skip`) {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing that I could skip for you.');
		serverQueue.connection.dispatcher.end('Skip command has been used!');
		return undefined;
	} else if (command === `stop`) {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing that I could stop for you.');
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end('Stop command has been used!');
		return undefined;
	} else if (command === `vol`) {
		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		if (!args[1]) return msg.channel.send(`:loud_sound: Current volume is **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);
		return msg.channel.send(`:speaker: Êã ÊÛíÑ ÇáÕæÊ Çáí **${args[1]}**`);
	} else if (command === `np`) {
		if (!serverQueue) return msg.channel.send('áÇ íæÌÏ ÔíÁ ÍÇáí Ý ÇáÚãá.');
		const embedNP = new Discord.RichEmbed()
	.setDescription(`:notes: ÇáÇä íÊã ÊÔÛíá: **${serverQueue.songs[0].title}**`)
		return msg.channel.sendEmbed(embedNP);
	} else if (command === `queue`) {
		
		if (!serverQueue) return msg.channel.send('There is nothing playing.');
		let index = 0;
		const embedqu = new Discord.RichEmbed()
	.setDescription(`**Songs Queue**
${serverQueue.songs.map(song => `**${++index} -** ${song.title}`).join('\n')}
**ÇáÇä íÊã ÊÔÛíá** ${serverQueue.songs[0].title}`)
		return msg.channel.sendEmbed(embedqu);
	} else if (command === `pause`) {
		if (serverQueue && serverQueue.playing) {
			serverQueue.playing = false;
			serverQueue.connection.dispatcher.pause();
			return msg.channel.send('Êã ÅíÞÇÝ ÇáãæÓíÞì ãÄÞÊÇ!');
		}
		return msg.channel.send('There is nothing playing.');
	} else if (command === "resume") {
		if (serverQueue && !serverQueue.playing) {
			serverQueue.playing = true;
			serverQueue.connection.dispatcher.resume();
			return msg.channel.send('ÇÓÊÃäÝÊ ÇáãæÓíÞì ÈÇáäÓÈÉ áß !');
		}
		return msg.channel.send('áÇ íæÌÏ ÔíÁ ÍÇáí Ýí ÇáÚãá.');
	}

	return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
	const serverQueue = queue.get(msg.guild.id);
	console.log(video);
	
//	console.log('yao: ' + Util.escapeMarkdown(video.thumbnailUrl));
	const song = {
		id: video.id,
		title: Util.escapeMarkdown(video.title),
		url: `https://www.youtube.com/watch?v=${video.id}`
	};
	if (!serverQueue) {
		const queueConstruct = {
			textChannel: msg.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};
		queue.set(msg.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(msg.guild, queueConstruct.songs[0]);
		} catch (error) {
			console.error(`I could not join the voice channel: ${error}`);
			queue.delete(msg.guild.id);
			return msg.channel.send(`I could not join the voice channel: ${error}`);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		if (playlist) return undefined;
		else return msg.channel.send(` **${song.title}** Êã ÇÖÇÝå ÇáÇÛäíÉ Çáí ÇáÞÇÆãÉ!`);
	}
	return undefined;
}

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	console.log(serverQueue.songs);

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on('end', reason => {
			if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
			else console.log(reason);
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on('error', error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`ÈÏÁ ÊÔÛíá: **${song.title}**`);
}

client.on('message', message => {
    var prefix = "M";
    
      if (!message.content.startsWith(prefix)) return;
      var args = message.content.split(' ').slice(1);
      var argresult = args.join(' ');
      if (message.author.id == 411564557027508235) return;
    
    
    if (message.content.startsWith(prefix + 'playing')) {
    if (message.author.id !== '411564557027508235') return message.reply('** åÐÇ ÇáÃãÑ ÝÞØ áÕÇÍÈ ÇáÈæÊ æ ÔßÑÇðð **')
    client.user.setGame(argresult);
        message.channel.sendMessage(`**${argresult}** : Êã ÊÛííÑ ÇáÍÇáÉ`)
    } else
    
     
    if (message.content.startsWith(prefix + 'streem')) {
    if (message.author.id !== '322820141089947659') return message.reply('** åÐÇ ÇáÃãÑ ÝÞØ áÕÇÍÈ ÇáÈæÊ æ ÔßÑÇðð **')
    client.user.setGame(argresult, "http://twitch.tv/HA");
        message.channel.sendMessage(`**${argresult}** :Êã ÊÛííÑ ÇáÍÇáÉ Çáì ÓÊÑíãäÌ`)
    } else
    
    if (message.content.startsWith(prefix + 'setname')) {
    if (message.author.id !== '323160008411971585') return message.reply('** åÐÇ ÇáÃãÑ ÝÞØ áÕÇÍÈ ÇáÈæÊ æ ÔßÑÇðð **')
      client.user.setUsername(argresult).then
          message.channel.sendMessage(`**${argresult}** : Êã ÊÛíÑ ÇáÃÓã`)
      return message.reply("**áÇ ÊÓÊØíÚ ÊÛíÑ ÇáÃÓã ÇáÇ ÈÚÏ ÓÇÚÊíä**");
    } else
        
    if (message.content.startsWith(prefix + 'setavatar')) {
    if (message.author.id !== '323160008411971585') return message.reply('** åÐÇ ÇáÃãÑ ÝÞØ áÕÇÍÈ ÇáÈæÊ æ ÔßÑÇðð **')
    client.user.setAvatar(argresult);
        message.channel.sendMessage(`**${argresult}** : Êã ÊÛíÑ ÕæÑÉ ÇáÈæÊ`);
    } else
    
    
    if (message.content.startsWith(prefix + 'watching')) {
    if (message.author.id !== '234454368072630283') return message.reply('** åÐÇ ÇáÃãÑ ÝÞØ áÕÇÍÈ ÇáÈæÊ æ ÔßÑÇðð **')
        client.user.setActivity(argresult, {type : 'watching'});
     message.channel.sendMessage(`**${argresult}** : Êã ÊÛííÑ ÇáææÊÔíäÞ Çáì`)
    }
    
     });





	 
	 
client.on('ready', () => {
   console.log(`----------------`);
      console.log(`Desert Bot- Script By : i1Suhaib`);
        console.log(`----------------`);
      console.log(`ON ${client.guilds.size} Servers '     Script By : i1Suhaib ' `);
    console.log(`----------------`);
  console.log(`Logged in as ${client.user.tag}!`);
client.user.setGame(`.`,"http://twitch.tv/S-F")
client.user.setStatus("dnd")
});

client.login(process.env.BOT_TOKEN);

