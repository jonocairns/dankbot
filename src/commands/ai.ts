import {
    CacheType,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import {Command, CommandName} from '../util';
import {Configuration, OpenAIApi} from 'openai';

const configuration = new Configuration({apiKey: process.env.OPENAI_API_KEY});
const openai = new OpenAIApi(configuration);
const model = 'text-davinci-003';

export const ai: Command = {
    id: CommandName.ai,
    register: new SlashCommandBuilder()
        .setName(CommandName.ai)
        .setDescription('AI')
        .addStringOption((option) =>
            option
                .setName('prompt')
                .setDescription('Your prompt')
                .setRequired(true)
        ),

    async run(interaction: ChatInputCommandInteraction<CacheType>) {
        const prompt = interaction.options.get('prompt')?.value as string;
        const completion = await openai.createCompletion({model, prompt});
        const content = completion.data.choices[0].text;
        await interaction.editReply({content});
    },
};
