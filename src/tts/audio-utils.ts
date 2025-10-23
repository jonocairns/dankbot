/**
 * Wraps raw PCM audio data in a WAV file header
 * @param pcmData - Raw PCM audio data
 * @param sampleRate - Sample rate (default 22050 Hz for Piper)
 * @param channels - Number of channels (default 1 for mono)
 * @param bitsPerSample - Bits per sample (default 16)
 * @returns WAV formatted audio buffer
 */
export function pcmToWav(pcmData: Buffer, sampleRate = 22050, channels = 1, bitsPerSample = 16): Buffer {
	const dataSize = pcmData.length;
	const headerSize = 44;
	const fileSize = headerSize + dataSize - 8;

	const header = Buffer.alloc(headerSize);

	// RIFF chunk descriptor
	header.write('RIFF', 0);
	header.writeUInt32LE(fileSize, 4);
	header.write('WAVE', 8);

	// fmt sub-chunk
	header.write('fmt ', 12);
	header.writeUInt32LE(16, 16); // fmt chunk size
	header.writeUInt16LE(1, 20); // PCM format
	header.writeUInt16LE(channels, 22);
	header.writeUInt32LE(sampleRate, 24);
	header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28); // byte rate
	header.writeUInt16LE(channels * (bitsPerSample / 8), 32); // block align
	header.writeUInt16LE(bitsPerSample, 34);

	// data sub-chunk
	header.write('data', 36);
	header.writeUInt32LE(dataSize, 40);

	return Buffer.concat([header, pcmData]);
}
