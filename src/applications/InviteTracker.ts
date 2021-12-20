import {
    ArgsOf,
    Client,
    Discord,
    On, Slash, SlashOption
} from "discordx";
import {
    CommandInteraction,
} from "discord.js";
import AbstractCommand from "../structures/AbstractCommand";
import InvitationData from "../structures/InvitationData";

@Discord()
export abstract class InviteTracker extends AbstractCommand {

    private inviteCache = new Map<string, InvitationData[]>()
    private cacheInitialized = false

    @Slash('invites')
    private async onRunInvites(
        @SlashOption('target') target: string,
        interaction: CommandInteraction,
        client: Client
    ) {
        await interaction.deferReply({ ephemeral: false })

        if (interaction.guild == null) {
            return interaction.editReply({ content: 'This command can only be used in a guild.' })
        }

        /**
         *  We initialize the cache the first time the command is used to get
         *  around that funky delay between when the bot is "ready" and when
         *  the guild manager is instantiated
         */
        if (!this.cacheInitialized) {
            for (const [ _, guild ] of client.guilds.cache) {
                const invites = await guild.invites.fetch()

                this.inviteCache.set(guild.id, invites.map((invite) => {
                    return {
                        code: invite.code,
                        uses: invite.uses,
                        creatorId: invite.inviter?.id
                    } as InvitationData
                }))
            }
        }

        let member = target != null ?
            this.findTarget(target, interaction.guild)
            : interaction.guild.members.cache.find(member => member.id == interaction.user.id)

        if (member == null) {
            return interaction.editReply({ content: 'An error occurred while checking invitations.' })
        }

        let invitations = this.inviteCache.get(interaction.guild.id)

        if (invitations == null) {
            return interaction.editReply({ content: `${member.user.username} has no invitations.` })
        }

        let filteredInvitations = invitations.filter(data => data.creatorId == member!.user.id)

        if (filteredInvitations == null) {
            return interaction.editReply({ content: `${member.user.username} has no invitations.` })
        }

        let total = 0
        filteredInvitations.forEach(invitation => {
            total += invitation.uses
        })

        return interaction.editReply({ content: `${member.user.username} has ${filteredInvitations.length} invitation(s) with ${total} uses.` })
    }

    /**
     * Whenever the bot joins a new guild while running, make sure to update
     * our cache with invitations from that new guild
     *
     * @param guild
     * @param client
     */
    @On('guildCreate')
    async onGuildCreate([guild]: ArgsOf<'guildCreate'>, client: Client) {
        if (!this.cacheInitialized)
            return

        const invites = await guild.invites.fetch()

        this.inviteCache.set(guild.id, invites.map((invite) => {
            return {
                code: invite.code,
                uses: invite.uses,
                creatorId: invite.inviter?.id
            } as InvitationData
        }))
    }

    /**
     * Whenever the bot leaves a guild when running, make sure to remove
     * that guilds invitations from our cache
     *
     * @param guild
     * @param client
     */
    @On('guildDelete')
    onGuildDelete([guild]: ArgsOf<'guildDelete'>, client: Client) {
        if (!this.cacheInitialized)
            return

        this.inviteCache.delete(guild.id)
    }

    /**
     * Whenever a new invitation is created while the bot is running, make sure
     * to add that invitation to our cache
     *
     * @param createdInvite
     * @param client
     */
    @On('inviteCreate')
    onInviteCreate([createdInvite]: ArgsOf<'inviteCreate'>, client: Client) {
        if (!this.cacheInitialized)
            return

        if (createdInvite.guild == null)
            return

        const inviteCache = this.inviteCache.get(createdInvite.guild.id)
        const invitationData = {
            code: createdInvite.code,
            uses: createdInvite.uses,
            creatorId: createdInvite.inviter?.id
        } as InvitationData

        if (inviteCache == null) {
            this.inviteCache.set(createdInvite.guild.id, [invitationData])
        } else {
            this.inviteCache.get(createdInvite.guild.id)!.push(invitationData)
        }
    }

    /**
     * Whenever an invitation is deleted while the bot is running, make sure
     * to remove that invitation from our cache
     *
     * @param deletedInvite
     * @param client
     */
    @On('inviteDelete')
    onInviteDelete([deletedInvite]: ArgsOf<'inviteDelete'>, client: Client) {
        if (!this.cacheInitialized)
            return

        if (deletedInvite.guild == null)
            return

        if (!this.inviteCache.has(deletedInvite.guild.id))
            return

        this.inviteCache.set(deletedInvite.guild.id,
            this.inviteCache.get(deletedInvite.guild.id)!
                .filter(invite => invite.code == deletedInvite.code))
    }

    /**
     * Whenever a new member joins a server check which invite was incremented
     * and increment it in our cache as well
     *
     * @param member
     * @param client
     */
    @On('guildMemberAdd')
    async onGuildMemberAdd([member]: ArgsOf<'guildMemberAdd'>, client: Client) {
        if (!this.cacheInitialized)
            return

        const currentInvites = await member.guild.invites.fetch()

        if (currentInvites == null)
            return

        const cachedInvites = this.inviteCache.get(member.guild.id)

        if (cachedInvites == null)
            return

        let cachedIndex = -1

        const usedInvite = currentInvites.find((invite) => {
            if (invite.uses == null)
                return false

            const matchingCached = cachedInvites.find(cachedInvite => cachedInvite.code == invite.code)

            if (matchingCached == null)
                return false

            if (invite.uses > matchingCached.uses) {
                cachedIndex = cachedInvites.indexOf(matchingCached)
                return true
            }

            return false
        })

        if (usedInvite == null)
            return

        this.inviteCache.get(member.guild.id)![cachedIndex].uses++
    }

}