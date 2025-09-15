/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, Modality} from '@google/genai';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const imageEditModel = 'gemini-2.5-flash-image-preview';
const visionModel = 'gemini-2.5-flash';

// Array of different poses to generate
const poses = [
  // Combat / Action
  'in a dynamic high-kick pose',
  'launching a powerful uppercut',
  'wielding a long wooden bo staff in a defensive stance',
  'drawing a sword from its sheath',
  'aiming a bow and arrow',
  'casting a magic spell with glowing hands',
  
  // Stances
  'in a graceful crane stance, balancing on one leg',
  'in a low, powerful horse stance with fists ready',
  'in a classic praying mantis style pose',
  'executing a fluid snake style movement, low to the ground',

  // Dramatic / Emotive
  'standing on a cliff edge, cape billowing in the wind',
  'looking over their shoulder with a mysterious expression',
  'raising a triumphant fist to the sky',
  'kneeling in defeat, head bowed',
  
  // Relaxing / Casual
  'leaning against a wall, arms crossed casually',
  'sitting by a campfire, looking thoughtful',
  'reading a book in a comfortable chair',
  'walking through a bustling city street'
];

// Array of different expressions
const expressions = [
  'a neutral expression',
  'a slight smile',
  'a joyful grin',
  'a determined grit',
  'an angry scowl',
  'a surprised look',
  'a sad frown',
  'a thoughtful and pensive look',
  'a mischievous smirk',
  'a serene and calm expression'
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
                    text: 'Act as an expert character concept artist. Your goal is to create a "character sheet" prompt that ensures perfect consistency for an image generation model. Focus obsessively on the face. Break down every facial feature with extreme detail: eye shape (e.g., "almond-shaped," "hooded"), eye color (be specific, e.g., "emerald green with gold flecks"), nose bridge and tip, lip shape and fullness, jawline (e.g., "sharp," "soft"), and any unique markers like freckles or scars. After the face, describe hair style and color, then clothing in detail. Conclude with the art style (e.g., "modern anime style with soft lighting"). The output must be a single, dense paragraph, ready to be used as a base prompt.'
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
 * Generates a single image based on a reference image and a prompt, then appends it to the gallery.
 * @param {string} prompt The full prompt for image generation.
 * @param {string} base64Image The base64 encoded reference image.
 * @param {string} mimeType The mime type of the reference image.
 * @param {HTMLElement} imageGallery The gallery element to append the image to.
 */
async function generateAndDisplayImage(prompt: string, base64Image: string, mimeType: string, imageGallery: HTMLElement) {
    const response = await ai.models.generateContent({
        model: imageEditModel,
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    if (response?.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const src = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                const img = new Image();
                img.src = src;
                img.alt = prompt;
                imageGallery.appendChild(img);
                break; // Assume one image is generated per call
            }
        }
    }
}

async function main() {
    // Main page elements
    const imageUpload = document.getElementById('image-upload') as HTMLInputElement;
    const analyzeButton = document.getElementById('analyze-button') as HTMLButtonElement;
    const descriptionSection = document.getElementById('description-section');
    const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
    const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
    const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
    const loadingIndicator = document.getElementById('loading-indicator');
    const imageGallery = document.getElementById('image-gallery');
    const customPosesInput = document.getElementById('custom-poses-input') as HTMLTextAreaElement;


    if (!imageUpload || !analyzeButton || !descriptionSection || !imagePreview || !promptInput || !generateButton || !loadingIndicator || !imageGallery || !customPosesInput) {
        console.error('Required HTML elements not found.');
        return;
    }

    let uploadedFile: File | null = null;
    let uploadedFileParts: { base64: string, mimeType: string } | null = null;

    imageUpload.addEventListener('change', () => {
        if (imageUpload.files && imageUpload.files.length > 0) {
            uploadedFile = imageUpload.files[0];
            analyzeButton.disabled = false;
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target?.result as string;
            };
            reader.readAsDataURL(uploadedFile);
            // Reset state
            uploadedFileParts = null;
            descriptionSection.classList.add('hidden');
            promptInput.value = '';

        } else {
            uploadedFile = null;
            analyzeButton.disabled = true;
        }
    });

    analyzeButton.addEventListener('click', async () => {
        if (!uploadedFile) {
            alert('Please upload an image first.');
            return;
        }

        try {
            analyzeButton.disabled = true;
            loadingIndicator.style.color = '#f0f0f0';
            loadingIndicator.textContent = 'Analyzing character...';
            loadingIndicator.style.display = 'block';

            uploadedFileParts = await fileToGenerativePart(uploadedFile);
            const description = await generateDescriptionFromImage(uploadedFileParts.base64, uploadedFileParts.mimeType);
            
            promptInput.value = description;
            descriptionSection.classList.remove('hidden');
            loadingIndicator.style.display = 'none';

        } catch (error) {
            console.error("Error during analysis:", error);
            loadingIndicator.textContent = 'Error: Could not analyze image. Check the console.';
            loadingIndicator.style.color = 'red';
        } finally {
             analyzeButton.disabled = false;
        }
    });

    /**
     * Kicks off the image generation process with a given set of poses.
     * @param posesToGenerate An array of pose description strings.
     */
    async function startGeneration(posesToGenerate: string[]) {
        const basePrompt = promptInput.value.trim();
        if (!basePrompt) {
            alert('The description cannot be empty.');
            return;
        }

        if (!uploadedFileParts) {
            alert('Analysis data is missing. Please re-upload and analyze the image.');
            return;
        }
        
        try {
            generateButton.disabled = true;
            imageGallery.textContent = '';
            loadingIndicator.style.color = '#f0f0f0';
            loadingIndicator.textContent = `Generating ${posesToGenerate.length} poses, this may take a moment...`;
            loadingIndicator.style.display = 'block';

            for (const pose of posesToGenerate) {
                const expression = expressions[Math.floor(Math.random() * expressions.length)];
                const fullPrompt = `${basePrompt} Using the provided image as a strict reference for the character's face, appearance, and art style, redraw the character ${pose}. The character should have ${expression} on their face. Do not alter the character's identity.`;
                await generateAndDisplayImage(fullPrompt, uploadedFileParts.base64, uploadedFileParts.mimeType, imageGallery);
            }

            loadingIndicator.style.display = 'none';

        } catch (error) {
            console.error("Error during generation process:", error);
            loadingIndicator.textContent = 'Error: Could not load images. Check the console for details.';
            loadingIndicator.style.color = 'red';
        } finally {
            generateButton.disabled = false;
        }
    }
    
    generateButton.addEventListener('click', () => {
        const customPosesText = customPosesInput.value.trim();
        let posesToGenerate: string[];

        if (customPosesText) {
            posesToGenerate = customPosesText
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);
        } else {
            // Use default poses if the input is empty
            posesToGenerate = poses;
        }

        const maxPoses = 10;
        if (posesToGenerate.length > maxPoses) {
            if (customPosesText) { // Only show alert if user provided custom poses
                alert(`You have entered ${posesToGenerate.length} poses. The maximum number of poses allowed is ${maxPoses}. Only the first ${maxPoses} will be generated.`);
            }
            posesToGenerate = posesToGenerate.slice(0, maxPoses);
        }

        if (posesToGenerate.length > 0) {
            startGeneration(posesToGenerate);
        } else {
            alert('Please enter at least one pose description, or leave the box empty to use the default poses.');
        }
    });
}

main();