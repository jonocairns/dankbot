export class ImageGenerationError extends Error {
	constructor(
		message: string,
		public readonly originalError?: unknown,
	) {
		super(message);
		this.name = "ImageGenerationError";
	}
}

export class SafetyViolationError extends ImageGenerationError {
	constructor(
		message: string,
		public readonly violations: Array<string>,
		public readonly requestId?: string,
		originalError?: unknown,
	) {
		super(message, originalError);
		this.name = "SafetyViolationError";
	}
}
