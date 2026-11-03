import { RequestRejectedError } from "../security";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_MIME_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
]);

export async function downloadDiscordImage(
	imageUrl: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
	const url = new URL(imageUrl);
	if (
		url.protocol !== "https:" ||
		!["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname) ||
		url.port ||
		url.username ||
		url.password ||
		!url.pathname.startsWith("/attachments/")
	) {
		throw new RequestRejectedError(
			"Please use an image attached directly to Discord.",
		);
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000);
	try {
		const response = await fetch(url, {
			signal: controller.signal,
			redirect: "error",
		});
		const mimeType =
			response.headers
				.get("content-type")
				?.split(";")[0]
				.trim()
				.toLowerCase() ?? "";
		if (!response.ok || !response.body || !IMAGE_MIME_TYPES.has(mimeType)) {
			throw new RequestRejectedError(
				"Unable to download a supported image attachment.",
			);
		}
		const size = Number(response.headers.get("content-length"));
		if (!Number.isFinite(size) || size < 0 || size > MAX_IMAGE_BYTES) {
			throw new RequestRejectedError(
				"Image attachments must be 10 MiB or smaller.",
			);
		}

		const reader = response.body.getReader();
		const chunks: Array<Buffer> = [];
		let total = 0;
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > MAX_IMAGE_BYTES) {
				throw new RequestRejectedError(
					"Image attachments must be 10 MiB or smaller.",
				);
			}
			chunks.push(Buffer.from(value));
		}
		if (total === 0)
			throw new RequestRejectedError("The image attachment is empty.");
		return { buffer: Buffer.concat(chunks, total), mimeType };
	} finally {
		clearTimeout(timeout);
		controller.abort();
	}
}

export function decodeGeneratedImage(data: string): Buffer {
	if (data.length > 4 * Math.ceil(MAX_IMAGE_BYTES / 3)) {
		throw new Error("Generated image exceeds the 10 MiB limit");
	}
	const buffer = Buffer.from(data, "base64");
	if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
		throw new Error("Generated image is empty or exceeds the 10 MiB limit");
	}
	return buffer;
}
