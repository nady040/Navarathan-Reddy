/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, GeneratedImage, PersonGeneration} from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const imageModel = 'imagen-4.0-generate-001';
const visionModel = 'gemini-2.5-flash';

// Array of different poses to generate
const poses = [
  'in a dynamic high-kick pose',
  'in a graceful crane stance, balancing on one leg',
  'wielding a long wooden bo staff in a defensive stance',
  'in a low, powerful horse stance with fists ready',
  'in a classic praying mantis style pose',
  'executing a fluid snake style movement, low to the ground'
];

/**
 * Converts a file to a base64 string.
 * @param {File} file The file to convert.
 * @returns {Promise<{base64: string, mimeType: string}>} The base64 representation and mime type.
 */
function fileToGenerativePart(file: File): Promise<{ base64: string, mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a descriptive prompt from an image.
 * @param {string} base64Image The base64 encoded image.
 * @param {string} mimeType The mime type of the image.
 * @returns {Promise<string>} A descriptive prompt.
 */
async function generateDescriptionFromImage(base64Image: string, mimeType: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: visionModel,
        contents: {
            parts: [
                {
                    text: 'Create a highly detailed and specific character reference prompt for an image generation model, designed to consistently recreate the character in different poses. Describe the character\'s physical features (face shape, eye color, hair style and color), their exact clothing including specific designs or accessories, the detailed anime-inspired art style, the precise color palette, and the background atmosphere. The output should be a single, cohesive paragraph that can be used directly as a base prompt.'
                },
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
            ],
        },
    });
    return response.text.trim();
}


/**
 * Generates a single image based on a prompt and appends it to the gallery.
 * @param {string} prompt The full prompt for image generation.
 * @param {HTMLElement} imageGallery The gallery element to append the image to.
 */
async function generateAndDisplayImage(prompt: string, imageGallery: HTMLElement) {
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: prompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '4:3',
            personGeneration: PersonGeneration.ALLOW_ADULT,
            outputMimeType: 'image/jpeg',
            includeRaiReason: true,
        },
    });

    if (response?.generatedImages) {
        response.generatedImages.forEach((generatedImage: GeneratedImage) => {
            if (generatedImage.image?.imageBytes) {
                const src = `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;
                const img = new Image();
                img.src = src;
                img.alt = prompt;
                imageGallery.appendChild(img);
            }
        });
    }
    console.log('Full response for prompt:', prompt, response);
}

async function main() {
    const imageGallery = document.getElementById('image-gallery');
    const loadingIndicator = document.getElementById('loading-indicator');
    const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
    const generateButton = document.getElementById('generate-button');

    if (!imageGallery || !loadingIndicator || !imageUpload || !generateButton) {
        console.error('Required HTML elements not found.');
        return;
    }

    generateButton.addEventListener('click', async () => {
        const file = imageUpload.files?.[0];
        if (!file) {
            alert('Please upload an image first.');
            return;
        }

        try {
            imageGallery.textContent = '';
            loadingIndicator.style.color = '#f0f0f0';
            loadingIndicator.textContent = 'Analyzing image...';
            loadingIndicator.style.display = 'block';

            const { base64, mimeType } = await fileToGenerativePart(file);
            const basePrompt = await generateDescriptionFromImage(base64, mimeType);
            
            loadingIndicator.textContent = 'Generating different poses, this may take a moment...';

            for (const pose of poses) {
                const fullPrompt = `${basePrompt} Show the character ${pose}.`;
                await generateAndDisplayImage(fullPrompt, imageGallery);
            }

            loadingIndicator.style.display = 'none';

        } catch (error) {
            console.error("Error during generation process:", error);
            loadingIndicator.textContent = 'Error: Could not load images. Check the console for details.';
            loadingIndicator.style.color = 'red';
        }
    });
}

main();