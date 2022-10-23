import {
    CacheType,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import {Command, CommandName} from '../util';
import fs from 'fs';

export const doj: Command = {
    id: CommandName.doj,
    register: new SlashCommandBuilder()
        .setName(CommandName.doj)
        .setDescription('Dick or Jeep')
        .addStringOption((option) =>
            option
                .setName('doj')
                .setDescription('Dick or Jeep')
                .addChoices(
                    {name: 'Dick', value: 'Dick'},
                    {name: 'Jeep', value: 'Jeep'}
                )
                .setRequired(true)
        ),

    async run(interaction: ChatInputCommandInteraction<CacheType>) {
        const input = interaction.options.get('doj')?.value as string;
        const isDick = Math.random() < 0.5;
        const path = isDick ? './images/dick.png' : './images/jeep.png';
        const file = fs.readFileSync(path);

        const hasWon =
            (input === 'Dick' && isDick) || (input === 'Jeep' && !isDick);

        await interaction.editReply({
            files: [file],
            content: hasWon
                ? 'Congratulations. You won this time'
                : 'You lose, loser McLoserface',
        });
    },
};
