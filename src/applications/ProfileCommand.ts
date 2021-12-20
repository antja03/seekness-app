import {
    Discord,
    Slash,
    SlashOption
} from "discordx";
import {
    CommandInteraction,
    MessageEmbed,
} from "discord.js";
import AbstractCommand from "../structures/AbstractCommand";
import moment from "moment";

@Discord()
export abstract class ProfileCommand extends AbstractCommand {

    @Slash('profile')
    private async onRunProfile(
        @SlashOption('target') target: string,
        interaction: CommandInteraction,
    ) {
        await interaction.deferReply({ ephemeral: false })

        if (interaction.guild == null) {
            return interaction.editReply({ content: 'This command can only be used in a guild.' })
        }

        let member = target != null ?
            this.findTarget(target, interaction.guild)
            : interaction.guild.members.cache.find(member => member.id == interaction.user.id)

        if (member == null) {
            return interaction.editReply({ content: 'An error occurred while checking invitations.' })
        }

        const nowDate = moment()
        const joinDate = moment(member.joinedAt!)

        let days = nowDate.diff(joinDate, 'days')
        nowDate.subtract(days, 'days')
        let hours = nowDate.diff(joinDate, 'hours')

        const embed = new MessageEmbed()
            .setColor('#ff9030')
            .setThumbnail(member.user.displayAvatarURL())
            .addField('Username', `${member.user.username}#${member.user.discriminator}`)
            .addField('Join date', `${joinDate.format('MM/DD/yyyy HH:mm')} EST`)
            .addField('Time in guild', `${days} day(s) and ${hours} hour(s)`)

        await interaction.editReply({
            embeds: [embed]
        })
    }

}