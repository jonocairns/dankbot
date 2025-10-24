# Image Generation

This bot supports multiple image generation providers through a flexible service architecture.

## Supported Providers

### 1. OpenAI (Default)
Uses OpenAI's image generation models (DALL-E, GPT-Image, etc.)

**Required Environment Variables:**
```bash
IMAGE_PROVIDER=openai
OPENAI_API_KEY=your-api-key-here
OPENAI_IMAGE_MODEL=gpt-image-1  # Optional, defaults to gpt-image-1
```

### 2. Google Gemini (Nano Banana)
Uses Google's Gemini 2.5 Flash Image model (also known as "Nano Banana")

**Required Environment Variables:**
```bash
IMAGE_PROVIDER=gemini
GOOGLE_API_KEY=your-google-api-key-here
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image  # Optional, defaults to gemini-2.5-flash-image
```

## Configuration

1. Copy `.env.example` to `.env` if you haven't already
2. Set the `IMAGE_PROVIDER` to either `openai` or `gemini`
3. Add the appropriate API key for your chosen provider
4. (Optional) Customize the model name

## Usage

Use the `/img` command in Discord:

```
/img prompt: A picture of a nano banana dish in a fancy restaurant
```

You can also attach an image to provide context for generation:

```
/img prompt: Make this look like a Van Gogh painting [attach an image]
```

The bot will automatically use the configured image provider to generate and upload the image. Both OpenAI and Gemini providers support context images.

## Pricing Information (as of 2025)

### OpenAI
- Varies by model (check OpenAI pricing page)

### Google Gemini 2.5 Flash Image
- $30.00 per 1 million output tokens
- Each image = 1290 output tokens
- Cost: ~$0.039 per image

## Architecture

The image generation system uses a service pattern:

- `src/image/image-service.ts` - Main interface and factory
- `src/image/openai-image.ts` - OpenAI implementation
- `src/image/gemini-image.ts` - Google Gemini implementation
- `src/commands/img.ts` - Discord command handler

This architecture makes it easy to add new image generation providers in the future.
