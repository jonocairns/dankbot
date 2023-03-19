import {Message} from 'discord.js';
import {logger} from './logger';
import {Configuration, OpenAIApi} from 'openai';

const AI_MODEL = 'text-davinci-003';

export const ai = async (message: Message, botId?: string) => {
    message.channel.sendTyping();

    try {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);
        const prompt = message.content.replace(`<@${botId}>`, '').trim();

        const completion = await openai.createCompletion({
            model: AI_MODEL,
            prompt,
            max_tokens: 2048,
        });
        const content = completion.data.choices[0].text;
        await message.reply({content});
    } catch (err) {
        logger.error(err);
        message.reply({
            content:
                'Something went wrong my G.\r\n https://status.openai.com/',
        });
    }
};
