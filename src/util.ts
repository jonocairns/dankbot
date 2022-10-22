import fs from 'fs';
import path from 'path';
import {logger} from './index';

export const readFiles = async (
    directory: string,
    action: (files: Array<string>) => void
) => {
    fs.readdir(path.join(__dirname, directory), (err, files) => {
        if (err) {
            logger.error('Unable to scan directory: ' + err);
            return;
        }

        action(files);
        logger.debug(`loaded ${files.length} files from ${directory}`);
    });
};
