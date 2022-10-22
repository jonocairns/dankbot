import {CacheType, ChatInputCommandInteraction} from 'discord.js';

export const cleanUp = async (
    interaction: ChatInputCommandInteraction<CacheType>
) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (interaction.isRepliable()) {
        await interaction.deleteReply();
    }
};
