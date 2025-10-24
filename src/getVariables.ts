export enum Arg {
	DISCORD_BOT_TOKEN = "DISCORD_BOT_TOKEN",
	APPLICATION_ID = "APPLICATION_ID",
}

const validate = (arg: string) => {
	const value = process.env[arg] ?? "";

	if (!value) {
		throw new Error(`${value} not defined in .env`);
	}

	return value;
};

export const getVariables = () => {
	const token = validate(Arg.DISCORD_BOT_TOKEN);
	const appId = validate(Arg.APPLICATION_ID);

	return { token, appId };
};
