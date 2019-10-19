import textToSpeech, {
  SynthesizeSpeechRequest,
} from '@google-cloud/text-to-speech';
import Discord from 'discord.js';
import stream from 'stream';

import {clean} from './clean';
import {logger} from './index';

export const speech = async (
  msg: Discord.Message,
  connection: Discord.VoiceConnection
) => {
  const key = Buffer.from(
    process.env.GOOGLE_PRIVATE_KEY || '',
    'base64'
  ).toString('ascii');
  const client = new textToSpeech.TextToSpeechClient({
    credentials: {
      // eslint-disable-next-line @typescript-eslint/camelcase
      client_email: process.env.GOOGLE_EMAIL || '',
      // eslint-disable-next-line @typescript-eslint/camelcase
      private_key: key,
    },
  });
  const text = msg.content.replace('.speak', '');

  const request: SynthesizeSpeechRequest = {
    input: {text},
    voice: {
      languageCode: 'en-IN',
      ssmlGender: 'FEMALE',
    },
    audioConfig: {audioEncoding: 'OGG_OPUS'},
  };
  try {
    const [response] = await client.synthesizeSpeech(request);

    const bufferStream = new stream.PassThrough();
    bufferStream.end(response.audioContent);

    const dispatch = connection.playStream(bufferStream);

    clean(dispatch, msg);
  } catch (e) {
    logger.error(e);
  }
};
