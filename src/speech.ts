import textToSpeech, {
  SynthesizeSpeechRequest,
} from '@google-cloud/text-to-speech';
import Discord from 'discord.js';
import stream from 'stream';

import {clean} from './clean';
import {logger} from './index';

interface Language {
  short: string;
  code: string;
  gender: 'MALE' | 'FEMALE';
}

export const languages: Array<Language> = [
  {short: 'chinese', code: 'cmn-CN-Wavenet-B', gender: 'MALE'},
  {short: 'german', code: 'de-DE-Wavenet-D', gender: 'MALE'},
  {short: 'australian', code: 'en-AU-Wavenet-B', gender: 'MALE'},
  {short: 'indian', code: 'en-IN-Wavenet-A', gender: 'FEMALE'},
  {short: 'english', code: 'en-GB-Wavenet-B', gender: 'MALE'},
  {short: 'us', code: 'en-US-Wavenet-A', gender: 'MALE'},
  {short: 'french', code: 'fr-FR-Wavenet-B', gender: 'MALE'},
  {short: 'italian', code: 'it-IT-Standard-D', gender: 'MALE'},
  {short: 'russian', code: 'ru-RU-Wavenet-B', gender: 'MALE'},
];

let defaultLanguage = languages[0];

export const setLang = (lang: Language) => {
  defaultLanguage = lang;
};

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
      languageCode: defaultLanguage.code,
      ssmlGender: defaultLanguage.gender as 'MALE' | 'FEMALE',
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
