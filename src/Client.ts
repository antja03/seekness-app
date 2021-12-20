import "reflect-metadata";
import path from "path";
import {GuildMember, Intents, Interaction, Message} from "discord.js";
import {Client} from "discordx";
import Config from "./Config"

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_VOICE_STATES,
    ],
    classes: [
        path.join(__dirname, "applications", "**/*.{ts,js}"),
        path.join(__dirname, "events", "**/*.{ts,js}"),
    ],
    botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
    silent: true,
});

client.once("ready", async () => {
    await client.clearApplicationCommands()
    await client.initApplicationCommands({guild: {log: true}, global: {log: true},});
    await client.initApplicationPermissions(true);
});

client.on("interactionCreate", async (interaction: Interaction) => {
    await client.executeInteraction(interaction);
});

client.on("messageCreate", async (message: Message) => {
    await client.executeCommand(message);
});

process.on('SIGINT', onExit)

function onExit() {
}

client.login(Config.token);
