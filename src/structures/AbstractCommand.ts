import {CommandInteraction, Guild, GuildMember} from "discord.js";

export default class AbstractCommand {

    findTarget(target: string, guild: Guild): GuildMember | undefined {
        if (target == null)
            return undefined

        if (target.startsWith('<@'))
            target = target.slice(2)

        if (target.endsWith('>'))
            target = target.slice(0, -1)

        if (target.startsWith('!'))
            target = target.slice(1)

        return guild.members.cache.find(member => member.id == target)
    }

}