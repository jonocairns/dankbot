import winston from "winston";

export const logger = winston.createLogger({
	transports: [new winston.transports.Console()],
	format: winston.format.printf(
		(log) => `[${log.level.toUpperCase()}] - ${log.message}`,
	),
});
