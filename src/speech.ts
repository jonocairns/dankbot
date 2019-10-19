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
  {short: 'chinese', code: 'cmn-CN', gender: 'MALE'},
  {short: 'german', code: 'de-DE', gender: 'MALE'},
  {short: 'australian', code: 'en-AU', gender: 'MALE'},
  {short: 'indian', code: 'en-IN', gender: 'FEMALE'},
  {short: 'english', code: 'en-GB', gender: 'MALE'},
  {short: 'us', code: 'en-US', gender: 'MALE'},
  {short: 'french', code: 'fr-FR', gender: 'MALE'},
  {short: 'italian', code: 'it-IT', gender: 'MALE'},
  {short: 'russian', code: 'ru-RU', gender: 'MALE'},
  {short: 'arabic', code: 'ar-XA', gender: 'MALE'},
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
  const text = msg.content.toLowerCase().replace('.speak', '');

  const request: SynthesizeSpeechRequest = {
    input: {text},
    voice: {
      languageCode: defaultLanguage.code,
      ssmlGender: defaultLanguage.gender,
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
