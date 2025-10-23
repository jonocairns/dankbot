import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder} from 'discord.js';
import fs from 'fs';
import path from 'path';
import {logger} from './logger';

export const readFiles = async (directory: string, action: (files: Array<string>) => void) => {
	fs.readdir(path.join(__dirname, directory), (err, files) => {
		if (err) {
			logger.error('Unable to scan directory: ' + err);
			return;
		}

		action(files);
		logger.debug(`loaded ${files.length} files from ${directory}`);
	});
};

export interface Command {
	id: CommandName;
	register: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'> | SlashCommandOptionsOnlyBuilder;
	run(interaction: ChatInputCommandInteraction<CacheType>): Promise<void>;
}

export enum CommandName {
	meme = 'meme',
	yt = 'yt',
	ask = 'ask',
}
